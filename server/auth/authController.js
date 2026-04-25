const { supabase, generateTokens, storeRefreshToken } = require('./authMiddleware');
const { 
    hashPassword, 
    comparePassword, 
    generatePasswordResetToken,
    generateEmailVerificationToken,
    validatePasswordStrength 
} = require('./passwordUtils');
const { 
    sendWelcomeEmail, 
    sendPasswordResetEmail, 
    sendVerificationEmail,
    sendPasswordChangedEmail 
} = require('./emailService');

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
    try {
        const { email, password } = req.body;

        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Validate password strength
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.isValid) {
            return res.status(400).json({
                error: 'Password too weak',
                details: passwordCheck.errors,
                code: 'WEAK_PASSWORD'
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered',
                code: 'EMAIL_EXISTS'
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Generate email verification token
        const { token: verificationToken, expiresAt: verificationExpires } = generateEmailVerificationToken();

        // Create user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                email_verification_token: verificationToken,
                email_verification_expires: verificationExpires.toISOString()
            })
            .select('id, email, subscription_tier, created_at')
            .single();

        if (createError) {
            console.error('Error creating user:', createError);
            return res.status(500).json({
                error: 'Failed to create user',
                code: 'CREATE_ERROR'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(newUser);

        // Store refresh token
        await storeRefreshToken(newUser.id, refreshToken);

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send welcome email
        try {
            await sendWelcomeEmail(email);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        // Send verification email
        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                subscription_tier: newUser.subscription_tier
            },
            requiresEmailVerification: true
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Find user
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (findError || !user) {
            return res.status(401).json({
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                error: 'Account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Verify password
        const passwordMatch = await comparePassword(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await storeRefreshToken(user.id, refreshToken);

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                subscription_tier: user.subscription_tier,
                email_verified: user.email_verified
            },
            requiresEmailVerification: !user.email_verified
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
async function logout(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        // Remove session from database
        if (refreshToken) {
            await supabase
                .from('user_sessions')
                .delete()
                .eq('token', refreshToken);
        }

        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
}

/**
 * Get current user
 * GET /api/auth/me
 */
async function getMe(req, res) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, subscription_tier, is_active, email_verified, created_at, last_login_at')
            .eq('id', req.user.user_id)
            .single();

        if (error || !user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                subscription_tier: user.subscription_tier,
                is_active: user.is_active,
                email_verified: user.email_verified,
                created_at: user.created_at,
                last_login_at: user.last_login_at
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to get user',
            code: 'GET_USER_ERROR'
        });
    }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                code: 'MISSING_EMAIL'
            });
        }

        // Find user
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (user) {
            // Generate reset token
            const { token, expiresAt } = generatePasswordResetToken();

            // Store reset token
            await supabase
                .from('password_resets')
                .insert({
                    user_id: user.id,
                    token: token,
                    expires_at: expiresAt.toISOString()
                });

            // Send reset email
            try {
                await sendPasswordResetEmail(email, token);
            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError);
            }
        }

        // Always return success (security: don't reveal if email exists)
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: 'Failed to process request',
            code: 'FORGOT_ERROR'
        });
    }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Token and new password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Validate password strength
        const passwordCheck = validatePasswordStrength(newPassword);
        if (!passwordCheck.isValid) {
            return res.status(400).json({
                error: 'Password too weak',
                details: passwordCheck.errors,
                code: 'WEAK_PASSWORD'
            });
        }

        // Find valid reset token
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_resets')
            .select('*, users(email)')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (tokenError || !resetToken) {
            return res.status(400).json({
                error: 'Invalid or expired reset token',
                code: 'INVALID_TOKEN'
            });
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update user password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', resetToken.user_id);

        if (updateError) {
            return res.status(500).json({
                error: 'Failed to update password',
                code: 'UPDATE_ERROR'
            });
        }

        // Mark token as used
        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetToken.id);

        // Delete all user sessions (force re-login)
        await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', resetToken.user_id);

        // Send confirmation email
        try {
            await sendPasswordChangedEmail(resetToken.users.email);
        } catch (emailError) {
            console.error('Failed to send password changed email:', emailError);
        }

        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Failed to reset password',
            code: 'RESET_ERROR'
        });
    }
}

/**
 * Verify email with token
 * GET /api/auth/verify-email
 */
async function verifyEmail(req, res) {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required',
                code: 'MISSING_TOKEN'
            });
        }

        // Find user with this verification token
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email_verification_token', token)
            .gt('email_verification_expires', new Date().toISOString())
            .single();

        if (findError || !user) {
            return res.status(400).json({
                error: 'Invalid or expired verification token',
                code: 'INVALID_TOKEN'
            });
        }

        // Mark email as verified
        const { error: updateError } = await supabase
            .from('users')
            .update({
                email_verified: true,
                email_verification_token: null,
                email_verification_expires: null
            })
            .eq('id', user.id);

        if (updateError) {
            return res.status(500).json({
                error: 'Failed to verify email',
                code: 'VERIFY_ERROR'
            });
        }

        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            error: 'Failed to verify email',
            code: 'VERIFY_ERROR'
        });
    }
}

module.exports = {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    verifyEmail
};
