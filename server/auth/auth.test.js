/**
 * @jest-environment node
 */

const request = require('supertest');
const app = require('../server');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables for testing
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Skip tests if no Supabase credentials
const describeIfEnv = SUPABASE_URL && SUPABASE_SERVICE_KEY ? describe : describe.skip;

describeIfEnv('Authentication API Integration Tests', () => {
    let testEmail;
    let testPassword = 'Test1234!@#$';
    let cookies;

    beforeAll(() => {
        testEmail = `test${Date.now()}@example.com`;
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const res = await request(app)
                .get('/health')
                .expect(200);

            expect(res.body.status).toBe('healthy');
            expect(res.body.timestamp).toBeDefined();
        });
    });

    describe('Registration', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testEmail,
                    password: testPassword
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testEmail);
            expect(res.body.user.subscription_tier).toBe('free');
        });

        it('should reject weak passwords', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `weak${Date.now()}@example.com`,
                    password: '123'
                })
                .expect(400);

            expect(res.body.code).toBe('WEAK_PASSWORD');
        });

        it('should reject invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: testPassword
                })
                .expect(400);

            expect(res.body.code).toBe('INVALID_EMAIL');
        });

        it('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testEmail,
                    password: testPassword
                })
                .expect(409);

            expect(res.body.code).toBe('EMAIL_EXISTS');
        });

        it('should reject missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testEmail
                })
                .expect(400);

            expect(res.body.code).toBe('MISSING_FIELDS');
        });
    });

    describe('Login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword
                })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testEmail);
            
            // Capture cookies for protected routes
            cookies = res.headers['set-cookie'];
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(res.body.code).toBe('INVALID_CREDENTIALS');
        });

        it('should reject missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail
                })
                .expect(400);

            expect(res.body.code).toBe('MISSING_FIELDS');
        });
    });

    describe('Protected Routes', () => {
        it('should access /me with valid token', async () => {
            // Skip if no cookies from login
            if (!cookies) {
                console.log('Skipping: no cookies from login');
                return;
            }

            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', cookies)
                .expect(200);

            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testEmail);
        });

        it('should reject /me without token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(res.body.code).toBe('NO_TOKEN');
        });
    });

    describe('Token Refresh', () => {
        it('should refresh access token', async () => {
            if (!cookies) {
                console.log('Skipping: no cookies from login');
                return;
            }

            const res = await request(app)
                .post('/api/auth/refresh-token')
                .set('Cookie', cookies)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.accessToken).toBeDefined();
        });
    });

    describe('Password Reset', () => {
        it('should request password reset', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: testEmail
                })
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('should reject reset with invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    newPassword: 'NewPass1234!@#$'
                })
                .expect(400);

            expect(res.body.code).toBe('INVALID_TOKEN');
        });

        it('should reject reset with weak password', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'some-token',
                    newPassword: '123'
                })
                .expect(400);

            expect(res.body.code).toBe('WEAK_PASSWORD');
        });
    });

    describe('Logout', () => {
        it('should logout successfully', async () => {
            if (!cookies) {
                console.log('Skipping: no cookies from login');
                return;
            }

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', cookies)
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('should reject access after logout', async () => {
            if (!cookies) {
                console.log('Skipping: no cookies from login');
                return;
            }

            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', cookies)
                .expect(401);

            expect(res.body.code).toBe('INVALID_TOKEN').orBe('NO_TOKEN');
        });
    });
});

// Unit tests that don't require database
describe('Authentication API Unit Tests', () => {
    it('should return 404 for unknown routes', async () => {
        const res = await request(app)
            .get('/api/unknown-route')
            .expect(404);

        expect(res.body.code).toBe('NOT_FOUND');
    });
});
