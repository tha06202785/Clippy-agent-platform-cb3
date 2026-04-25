/**
 * Post Scheduler
 * Handles scheduling and publishing Facebook posts
 */

const { publishPost, deletePost } = require('./facebookService');
const { supabase } = require('../auth/authMiddleware');

/**
 * Schedule a new post
 * @param {Object} postData - Post data
 * @returns {Promise<Object>} Created post
 */
async function schedulePost(postData) {
    const {
        user_id,
        page_id,
        content,
        media_urls,
        link_url,
        scheduled_at
    } = postData;
    
    // Validate required fields
    if (!user_id || !page_id || !content) {
        throw new Error('Missing required fields: user_id, page_id, content');
    }
    
    // Get page connection
    const { data: connection, error: connError } = await supabase
        .from('facebook_connections')
        .select('*')
        .eq('user_id', user_id)
        .eq('page_id', page_id)
        .single();
    
    if (connError || !connection) {
        throw new Error('Page not connected');
    }
    
    // If scheduled_at is in the past or not provided, publish immediately
    const shouldPublishImmediately = !scheduled_at || new Date(scheduled_at) <= new Date();
    
    const postRecord = {
        user_id,
        page_id,
        content,
        media_urls: media_urls || [],
        link_url: link_url || null,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        status: shouldPublishImmediately ? 'publishing' : 'scheduled',
        created_at: new Date().toISOString()
    };
    
    // Save to database
    const { data: savedPost, error: saveError } = await supabase
        .from('facebook_posts')
        .insert(postRecord)
        .select()
        .single();
    
    if (saveError) {
        throw new Error(`Failed to schedule post: ${saveError.message}`);
    }
    
    // Publish immediately if no schedule
    if (shouldPublishImmediately) {
        try {
            const result = await publishPost(
                page_id,
                content,
                media_urls,
                link_url,
                connection.page_access_token
            );
            
            // Update with post ID
            await supabase
                .from('facebook_posts')
                .update({
                    post_id: result.post_id,
                    status: 'published',
                    published_at: new Date().toISOString()
                })
                .eq('id', savedPost.id);
            
            return {
                ...savedPost,
                post_id: result.post_id,
                status: 'published',
                published_at: new Date().toISOString()
            };
        } catch (error) {
            // Update status to failed
            await supabase
                .from('facebook_posts')
                .update({
                    status: 'failed',
                    error_message: error.message
                })
                .eq('id', savedPost.id);
            
            throw error;
        }
    }
    
    return savedPost;
}

/**
 * Get scheduled posts that need to be published
 * @returns {Promise<Array>} Posts to publish
 */
async function getPendingPosts() {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
        .from('facebook_posts')
        .select(`
            *,
            facebook_connections!inner(page_access_token, auto_post_enabled)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });
    
    if (error) {
        throw new Error(`Failed to fetch pending posts: ${error.message}`);
    }
    
    return data || [];
}

/**
 * Publish a scheduled post
 * @param {string} postId - Post ID
 */
async function publishScheduledPost(postId) {
    // Get post details
    const { data: post, error } = await supabase
        .from('facebook_posts')
        .select(`
            *,
            facebook_connections(page_access_token)
        `)
        .eq('id', postId)
        .single();
    
    if (error || !post) {
        throw new Error('Post not found');
    }
    
    if (post.status !== 'scheduled') {
        throw new Error(`Post is not scheduled (status: ${post.status})`);
    }
    
    try {
        // Update status to publishing
        await supabase
            .from('facebook_posts')
            .update({ status: 'publishing' })
            .eq('id', postId);
        
        // Publish to Facebook
        const result = await publishPost(
            post.page_id,
            post.content,
            post.media_urls,
            post.link_url,
            post.facebook_connections.page_access_token
        );
        
        // Update as published
        await supabase
            .from('facebook_posts')
            .update({
                post_id: result.post_id,
                status: 'published',
                published_at: new Date().toISOString(),
                error_message: null
            })
            .eq('id', postId);
        
        return {
            success: true,
            post_id: result.post_id
        };
    } catch (error) {
        // Mark as failed
        await supabase
            .from('facebook_posts')
            .update({
                status: 'failed',
                error_message: error.message
            })
            .eq('id', postId);
        
        throw error;
    }
}

/**
 * Cancel a scheduled post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID (for authorization)
 */
async function cancelPost(postId, userId) {
    // Get post and verify ownership
    const { data: post, error } = await supabase
        .from('facebook_posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', userId)
        .single();
    
    if (error || !post) {
        throw new Error('Post not found or unauthorized');
    }
    
    if (post.status === 'published') {
        throw new Error('Cannot cancel published post');
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
        .from('facebook_posts')
        .delete()
        .eq('id', postId);
    
    if (deleteError) {
        throw new Error(`Failed to cancel post: ${deleteError.message}`);
    }
    
    return { success: true, message: 'Post cancelled' };
}

/**
 * Delete a published post from Facebook
 * @param {string} postId - Post ID
 * @param {string} userId - User ID (for authorization)
 */
async function deletePublishedPost(postId, userId) {
    // Get post and verify ownership
    const { data: post, error } = await supabase
        .from('facebook_posts')
        .select(`
            *,
            facebook_connections(page_access_token)
        `)
        .eq('id', postId)
        .eq('user_id', userId)
        .single();
    
    if (error || !post) {
        throw new Error('Post not found or unauthorized');
    }
    
    if (!post.post_id) {
        throw new Error('Post has not been published yet');
    }
    
    try {
        // Delete from Facebook
        await deletePost(post.post_id, post.facebook_connections.page_access_token);
        
        // Update status
        await supabase
            .from('facebook_posts')
            .update({
                status: 'deleted',
                error_message: null
            })
            .eq('id', postId);
        
        return { success: true, message: 'Post deleted' };
    } catch (error) {
        throw new Error(`Failed to delete post: ${error.message}`);
    }
}

/**
 * Get posts for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Posts
 */
async function getUserPosts(userId, options = {}) {
    const { 
        status = null, 
        page_id = null,
        limit = 50, 
        offset = 0 
    } = options;
    
    let query = supabase
        .from('facebook_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (status) {
        query = query.eq('status', status);
    }
    
    if (page_id) {
        query = query.eq('page_id', page_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
        throw new Error(`Failed to fetch posts: ${error.message}`);
    }
    
    return data || [];
}

/**
 * Update post content (only for scheduled posts)
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 */
async function updatePost(postId, userId, updates) {
    // Get post and verify ownership
    const { data: post, error } = await supabase
        .from('facebook_posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', userId)
        .single();
    
    if (error || !post) {
        throw new Error('Post not found or unauthorized');
    }
    
    // Can only update scheduled posts
    if (post.status !== 'scheduled' && post.status !== 'draft') {
        throw new Error('Can only update scheduled or draft posts');
    }
    
    // Allowed fields to update
    const allowedFields = ['content', 'media_urls', 'link_url', 'scheduled_at'];
    const updateData = {};
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    }
    
    const { data: updatedPost, error: updateError } = await supabase
        .from('facebook_posts')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single();
    
    if (updateError) {
        throw new Error(`Failed to update post: ${updateError.message}`);
    }
    
    return updatedPost;
}

/**
 * Run the post scheduler (call this from a cron job)
 * Publishes all posts that are scheduled and due
 */
async function runScheduler() {
    console.log('Running post scheduler...');
    
    try {
        const pendingPosts = await getPendingPosts();
        
        console.log(`Found ${pendingPosts.length} pending posts`);
        
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        for (const post of pendingPosts) {
            try {
                await publishScheduledPost(post.id);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    postId: post.id,
                    error: error.message
                });
            }
        }
        
        console.log('Scheduler complete:', results);
        return results;
    } catch (error) {
        console.error('Scheduler error:', error);
        throw error;
    }
}

module.exports = {
    schedulePost,
    getPendingPosts,
    publishScheduledPost,
    cancelPost,
    deletePublishedPost,
    getUserPosts,
    updatePost,
    runScheduler
};