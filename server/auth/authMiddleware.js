const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * JWT Authentication Middleware
 * Verifies access token and attaches user to request
 */
async function authenticateToken(req, res, next) {
    try {
        // Get token from cookie or Authorization header
        let token = req.cookies?.accessToken;
        
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ 
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        // Verify access token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        // Check if user still exists and is active
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, subscription_tier, is_active, email_verified')
            .eq('id', decoded.user_id)
            .single();

        if (error || !user) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                error: 'Account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Attach user to request
        req.user = {
            user_id: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier,
            email_verified: user.email_verified
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Optional authentication middleware
 * Attaches user if token valid, but doesn't reject if missing
 */
async function optionalAuth(req, res, next) {
    try {
        let token = req.cookies?.accessToken;
        
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const { data: user } = await supabase
                    .from('users')
                    .select('id, email, subscription_tier')
                    .eq('id', decoded.user_id)
                    .single();
                
                if (user && user.is_active) {
                    req.user = {
                        user_id: user.id,
                        email: user.email,
                        subscription_tier: user.subscription_tier
                    };
                }
            } catch (e) {
                // Token invalid, continue without user
            }
        }

        next();
    } catch (error) {
        next();
    }
}

/**
 * Refresh token middleware
 * Generates new access token from refresh token
 */
async function refreshAccessToken(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'No refresh token',
                code: 'NO_REFRESH_TOKEN'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        } catch (jwtError) {
            // Clear cookies if refresh token invalid
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Refresh token expired. Please login again.',
                    code: 'REFRESH_EXPIRED'
                });
            }
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH'
            });
        }

        // Check if session exists in database
        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .select('*, users!inner(id, email, subscription_tier, is_active)')
            .eq('token', refreshToken)
            .eq('user_id', decoded.user_id)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (sessionError || !session) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({
                error: 'Session not found or expired',
                code: 'SESSION_INVALID'
            });
        }

        if (!session.users.is_active) {
            return res.status(401).json({
                error: 'Account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            {
                user_id: session.users.id,
                email: session.users.email,
                tier: session.users.subscription_tier
            },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Set new access token cookie
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.json({
            success: true,
            accessToken: newAccessToken,
            expiresIn: 900 // 15 minutes in seconds
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            error: 'Failed to refresh token',
            code: 'REFRESH_ERROR'
        });
    }
}

/**
 * Generate tokens for user
 * @param {Object} user - User object
 * @returns {Object} - Access and refresh tokens
 */
function generateTokens(user) {
    const accessToken = jwt.sign(
        {
            user_id: user.id,
            email: user.email,
            tier: user.subscription_tier
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        {
            user_id: user.id,
            type: 'refresh'
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

/**
 * Store refresh token in database
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 */
async function storeRefreshToken(userId, token) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const { error } = await supabase
        .from('user_sessions')
        .insert({
            user_id: userId,
            token: token,
            expires_at: expiresAt.toISOString()
        });

    if (error) {
        console.error('Error storing refresh token:', error);
        throw new Error('Failed to create session');
    }
}

/**
 * Admin middleware - requires admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.subscription_tier !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    refreshAccessToken,
    generateTokens,
    storeRefreshToken,
    requireAdmin,
    supabase
};
