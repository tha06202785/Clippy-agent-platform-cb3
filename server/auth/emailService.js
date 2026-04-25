const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@useclippy.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://useclippy.com';

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Check if email service is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!SENDGRID_API_KEY;
}

/**
 * Send a welcome email to new users
 * @param {string} to - User email address
 * @param {string} name - User name (optional)
 */
async function sendWelcomeEmail(to, name = '') {
    if (!isConfigured()) {
        console.log('SendGrid not configured. Welcome email would be sent to:', to);
        return { success: false, reason: 'SendGrid not configured' };
    }

    const msg = {
        to,
        from: FROM_EMAIL,
        subject: 'Welcome to Clippy! 🎉',
        text: `Hi ${name || 'there'},

Welcome to Clippy! We're excited to have you on board.

Get started by exploring your dashboard at ${FRONTEND_URL}/dashboard

If you have any questions, just reply to this email.

Best,
The Clippy Team`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Clippy! 🎉</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Welcome to Clippy! We're excited to have you on board.</p>
            <p>
                <a href="${FRONTEND_URL}/dashboard" 
                   style="display: inline-block; background: #007bff; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                    Go to Dashboard
                </a>
            </p>
            <p>If you have any questions, just reply to this email.</p>
            <p>Best,<br>The Clippy Team</p>
        </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Welcome email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
}

/**
 * Send password reset email
 * @param {string} to - User email address
 * @param {string} token - Reset token
 */
async function sendPasswordResetEmail(to, token) {
    if (!isConfigured()) {
        console.log('SendGrid not configured. Password reset email would be sent to:', to);
        return { success: false, reason: 'SendGrid not configured', token };
    }

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    const msg = {
        to,
        from: FROM_EMAIL,
        subject: 'Reset your Clippy password',
        text: `Hi,

You requested a password reset for your Clippy account.

Click this link to reset your password (valid for 1 hour):
${resetUrl}

If you didn't request this, you can safely ignore this email.

Best,
The Clippy Team`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset your password</h2>
            <p>Hi,</p>
            <p>You requested a password reset for your Clippy account.</p>
            <p>
                <a href="${resetUrl}" 
                   style="display: inline-block; background: #dc3545; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                    Reset Password
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">This link is valid for 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>Best,<br>The Clippy Team</p>
        </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Password reset email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
}

/**
 * Send email verification email
 * @param {string} to - User email address
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(to, token) {
    if (!isConfigured()) {
        console.log('SendGrid not configured. Verification email would be sent to:', to);
        return { success: false, reason: 'SendGrid not configured', token };
    }

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    const msg = {
        to,
        from: FROM_EMAIL,
        subject: 'Verify your Clippy email address',
        text: `Hi,

Please verify your email address for your Clippy account.

Click this link to verify (valid for 24 hours):
${verifyUrl}

If you didn't create an account, you can safely ignore this email.

Best,
The Clippy Team`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Hi,</p>
            <p>Please verify your email address for your Clippy account.</p>
            <p>
                <a href="${verifyUrl}" 
                   style="display: inline-block; background: #28a745; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                    Verify Email
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">This link is valid for 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Best,<br>The Clippy Team</p>
        </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Verification email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * Send password changed confirmation email
 * @param {string} to - User email address
 */
async function sendPasswordChangedEmail(to) {
    if (!isConfigured()) {
        console.log('SendGrid not configured. Password changed email would be sent to:', to);
        return { success: false, reason: 'SendGrid not configured' };
    }

    const msg = {
        to,
        from: FROM_EMAIL,
        subject: 'Your Clippy password has been changed',
        text: `Hi,

Your Clippy account password has been successfully changed.

If you didn't make this change, please contact us immediately.

Best,
The Clippy Team`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Changed</h2>
            <p>Hi,</p>
            <p>Your Clippy account password has been successfully changed.</p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin: 16px 0;">
                <strong>Didn't make this change?</strong><br>
                Please contact us immediately if you didn't request this change.
            </div>
            <p>Best,<br>The Clippy Team</p>
        </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Password changed email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending password changed email:', error);
        throw new Error('Failed to send password changed email');
    }
}

/**
 * Send new lead notification email
 * @param {string} to - User email address
 * @param {Object} lead - Lead data from facebook_leads table
 */
async function sendLeadNotification(to, lead) {
    if (!isConfigured()) {
        console.log('SendGrid not configured. Lead notification would be sent to:', to);
        return { success: false, reason: 'SendGrid not configured' };
    }

    const fieldData = lead.field_data || {};
    const leadName = fieldData.full_name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim() || 'New Lead';
    const leadEmail = fieldData.email || fieldData.email_address || 'N/A';
    const leadPhone = fieldData.phone_number || fieldData.phone || 'N/A';

    const msg = {
        to,
        from: FROM_EMAIL,
        subject: `🎉 New Lead: ${leadName}`,
        text: `Hi,

You have a new lead from Facebook!

Name: ${leadName}
Email: ${leadEmail}
Phone: ${leadPhone}
Form: ${lead.form_name || 'Facebook Lead Ad'}
Time: ${new Date(lead.created_time).toLocaleString()}

View your leads at ${FRONTEND_URL}/dashboard/leads

Best,
The Clippy Team`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px;">
                <h2 style="color: #0ea5e9; margin: 0;">🎉 New Lead Alert!</h2>
            </div>
            <p>Hi,</p>
            <p>You have a new lead from <strong>${lead.form_name || 'Facebook Lead Ad'}</strong>!</p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${leadName}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${leadEmail}">${leadEmail}</a></p>
                <p style="margin: 8px 0;"><strong>Phone:</strong> ${leadPhone}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(lead.created_time).toLocaleString()}</p>
            </div>
            <p>
                <a href="${FRONTEND_URL}/dashboard/leads" 
                   style="display: inline-block; background: #0ea5e9; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                    View All Leads
                </a>
            </p>
            <p>Best,<br>The Clippy Team</p>
        </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Lead notification sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending lead notification:', error);
        throw new Error('Failed to send lead notification');
    }
}

module.exports = {
    isConfigured,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
    sendPasswordChangedEmail,
    sendLeadNotification
};
