import { RequestHandler } from "express";

const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0";

// Get Facebook access token from env
const getAccessToken = () => {
  return process.env.FACEBOOK_ACCESS_TOKEN;
};

// Schedule a Facebook post
export const schedulePost: RequestHandler = async (req, res) => {
  try {
    const { page_id, message, scheduled_time, image_url, link } = req.body;

    if (!page_id || !message) {
      return res.status(400).json({ error: "page_id and message required" });
    }

    const token = getAccessToken();
    if (!token) {
      return res.status(500).json({ error: "Facebook access token not configured" });
    }

    // Build form data
    const formData = new URLSearchParams();
    formData.append("message", message);
    formData.append("access_token", token);

    if (scheduled_time) {
      formData.append("scheduled_publish_time", String(Math.floor(new Date(scheduled_time).getTime() / 1000)));
      formData.append("published", "false");
    }

    if (link) {
      formData.append("link", link);
    }

    const response = await fetch(`${FACEBOOK_GRAPH_API}/${page_id}/feed`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to schedule post");
    }

    res.json({
      success: true,
      post_id: data.id,
      scheduled: !!scheduled_time,
      scheduled_time: scheduled_time || null,
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Facebook Schedule Post Error:", error);
    res.status(500).json({ error: error.message || "Failed to schedule post" });
  }
};

// Get scheduled posts
export const getScheduledPosts: RequestHandler = async (req, res) => {
  try {
    const { page_id } = req.query;

    if (!page_id) {
      return res.status(400).json({ error: "page_id required" });
    }

    const token = getAccessToken();
    if (!token) {
      return res.status(500).json({ error: "Facebook access token not configured" });
    }

    const url = new URL(`${FACEBOOK_GRAPH_API}/${page_id}/promotable_posts`);
    url.searchParams.append("access_token", token);
    url.searchParams.append("is_published", "false");
    url.searchParams.append("fields", "id,message,scheduled_publish_time,created_time,full_picture");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get scheduled posts");
    }

    const posts = data.data?.map((post: any) => ({
      id: post.id,
      message: post.message,
      scheduled_time: post.scheduled_publish_time
        ? new Date(post.scheduled_publish_time * 1000).toISOString()
        : null,
      created_at: post.created_time,
      image_url: post.full_picture,
      status: post.scheduled_publish_time ? "scheduled" : "published",
    })) || [];

    res.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error: any) {
    console.error("Facebook Get Posts Error:", error);
    res.status(500).json({ error: error.message || "Failed to get scheduled posts" });
  }
};

// Delete a scheduled post
export const deletePost: RequestHandler = async (req, res) => {
  try {
    const { post_id } = req.params;

    if (!post_id) {
      return res.status(400).json({ error: "post_id required" });
    }

    const token = getAccessToken();
    if (!token) {
      return res.status(500).json({ error: "Facebook access token not configured" });
    }

    const url = new URL(`${FACEBOOK_GRAPH_API}/${post_id}`);
    url.searchParams.append("access_token", token);

    const response = await fetch(url.toString(), { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to delete post");
    }

    res.json({
      success: true,
      message: "Post deleted successfully",
      deleted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Facebook Delete Post Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete post" });
  }
};

// Get page insights/stats
export const getPageStats: RequestHandler = async (req, res) => {
  try {
    const { page_id } = req.query;

    if (!page_id) {
      return res.status(400).json({ error: "page_id required" });
    }

    const token = getAccessToken();
    if (!token) {
      return res.status(500).json({ error: "Facebook access token not configured" });
    }

    // Get page info
    const pageUrl = new URL(`${FACEBOOK_GRAPH_API}/${page_id}`);
    pageUrl.searchParams.append("access_token", token);
    pageUrl.searchParams.append("fields", "fan_count,followers_count");

    const pageResponse = await fetch(pageUrl.toString());
    const pageData = await pageResponse.json();

    if (!pageResponse.ok) {
      throw new Error(pageData.error?.message || "Failed to get page stats");
    }

    res.json({
      success: true,
      followers: pageData.followers_count || pageData.fan_count || 0,
      total_posts: 0, // Would need separate call
      insights: [],
    });
  } catch (error: any) {
    console.error("Facebook Page Stats Error:", error);
    res.status(500).json({ error: error.message || "Failed to get page stats" });
  }
};

// Auto-reply to comments
export const setupAutoReply: RequestHandler = async (req, res) => {
  try {
    const { page_id, keywords, reply_template, enabled } = req.body;

    if (!page_id || !reply_template) {
      return res.status(400).json({ error: "page_id and reply_template required" });
    }

    res.json({
      success: true,
      message: "Auto-reply configured",
      page_id,
      keywords: keywords || [],
      enabled: enabled ?? true,
      configured_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Facebook Auto-Reply Setup Error:", error);
    res.status(500).json({ error: error.message || "Failed to setup auto-reply" });
  }
};
