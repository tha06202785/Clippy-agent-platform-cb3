const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    logout, 
    getMe, 
    forgotPassword, 
    resetPassword,
    verifyEmail 
} = require('./authController');
const { authenticateToken, refreshAccessToken } = require('./authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

module.exports = router;
