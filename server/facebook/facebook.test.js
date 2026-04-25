/**
 * Facebook Integration Tests
 * Run with: npm test
 */

const request = require('supertest');
const app = require('../server');
const { config, validateConfig } = require('./facebookConfig');

describe('Facebook Integration', () => {
    
    describe('Configuration', () => {
        test('should have required config values set', () => {
            expect(config.appId).toBeDefined();
            expect(config.appSecret).toBeDefined();
            expect(config.webhookVerifyToken).toBeDefined();
            expect(config.apiVersion).toBeDefined();
        });

        test('should validate configuration', () => {
            // This will throw if config is invalid
            expect(() => validateConfig()).not.toThrow();
        });
    });

    describe('Webhook Verification', () => {
        test('should verify webhook challenge', async () => {
            const challenge = 'test_challenge_123';
            const mode = 'subscribe';
            const token = config.webhookVerifyToken;

            const res = await request(app)
                .get('/webhooks/facebook')
                .query({
                    'hub.mode': mode,
                    'hub.verify_token': token,
                    'hub.challenge': challenge
                });

            expect(res.status).toBe(200);
            expect(res.text).toBe(challenge);
        });

        test('should reject invalid verification token', async () => {
            const res = await request(app)
                .get('/webhooks/facebook')
                .query({
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'invalid_token',
                    'hub.challenge': 'test'
                });

            expect(res.status).toBe(403);
        });
    });

    describe('Signature Verification', () => {
        test('should verify valid webhook signature', () => {
            const { verifyWebhookSignature, generateSignature } = require('./facebookConfig');
            
            const body = '{"test":"data"}';
            const signature = generateSignature(body);
            const isValid = verifyWebhookSignature(`sha256=${signature}`, body);
            
            expect(isValid).toBe(true);
        });

        test('should reject invalid signature', () => {
            const { verifyWebhookSignature } = require('./facebookConfig');
            
            const body = '{"test":"data"}';
            const isValid = verifyWebhookSignature('sha256=invalid', body);
            
            expect(isValid).toBe(false);
        });
    });

    describe('Protected Routes', () => {
        test('should require authentication for /api/facebook/auth', async () => {
            const res = await request(app)
                .get('/api/facebook/auth');

            expect(res.status).toBe(401);
        });

        test('should require authentication for /api/facebook/connection', async () => {
            const res = await request(app)
                .get('/api/facebook/connection');

            expect(res.status).toBe(401);
        });
    });
});
