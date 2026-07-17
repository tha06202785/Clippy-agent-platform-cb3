# Clippy QA Staging Environment Setup

**Last Updated:** 2026-07-17  
**Version:** 1.1.0-staging

---

## Quick Start

### Staging Deployment URL
https://clippy-staging.vercel.app

---

## Setup Checklist

### 1. Create Supabase Staging Project (SEPARATE from production)

**Steps:**
1. Go to supabase.com
2. Click New Project
3. Project name: Clippy Staging
4. Database password: Generate strong password (save to password manager)
5. Region: Choose same as production
6. DO NOT use production project

**After creation:**
- Go to Settings to API
- Copy Project URL to use in .env.local
- Copy anon public key to use in .env.local
- Copy service_role key to Add to Vercel env vars ONLY (never commit)

**Run migrations:**
In Supabase SQL Editor, run:
1. supabase/staging-setup.sql (enables RLS)
2. supabase/rls_policies.sql (creates policies)
3. supabase/staging-seed.sql (creates test orgs and data)

---

### 2. Configure Clerk Test Mode

**Steps:**
1. Go to clerk.com
2. Select your Clippy application
3. Go to API Keys in sidebar
4. Test Keys section:
   - Copy Publishable key to NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - Copy Secret key to CLERK_SECRET_KEY
5. Enable Test mode toggle

**Create Test Organisations and Users:**

1. Sign up as Organisation A Owner:
   - Go to staging URL
   - Click Sign Up
   - Email: owner.a@clippy-qa.test
   - Password: [Generate secure password - store in password manager]
   - Complete onboarding to Org name: Test Agency Alpha

2. Invite Organisation A Agent:
   - Go to /team
   - Click Invite team member
   - Email: agent.a@clippy-qa.test
   - Role: Agent
   - Accept invite via email

3. Sign up as Organisation B Owner:
   - Use incognito window
   - Email: owner.b@clippy-qa.test
   - Password: [Generate secure password]
   - Org name: Test Agency Beta

4. Invite Organisation B Agent:
   - Email: agent.b@clippy-qa.test
   - Role: Agent

**Record User IDs:**
After creating users, get their Clerk user IDs from Clerk dashboard to Users tab. Update supabase/staging-seed.sql with actual user IDs, then run the seed script.

---

### 3. Stripe Test Mode Configuration

**Steps:**
1. Go to dashboard.stripe.com/test
2. API Keys to Copy Secret key to STRIPE_SECRET_KEY
3. Webhooks to Add endpoint:
   - Endpoint URL: https://clippy-staging.vercel.app/api/webhooks/stripe
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
   - Copy Signing secret to STRIPE_WEBHOOK_SECRET

**Test Card Numbers:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0027 6000 3184

---

### 4. Create Private GitHub Repository

**Via GitHub UI:**
1. Go to github.com/new
2. Repository name: clippy-staging
3. Visibility: Private
4. Do NOT initialize with README
5. Click Create repository

**Via GitHub CLI:**
gh repo create clippy-staging --private --source=/root/clippy --remote=origin --push

**Push staging branch:**
cd /root/clippy
git checkout staging
git remote add origin https://github.com/YOUR_USERNAME/clippy-staging.git
git push -u origin staging

---

### 5. Vercel Staging Deployment

**Steps:**
1. Go to vercel.com
2. Click Add New to Project
3. Import GitHub repo: clippy-staging
4. Framework Preset: Next.js
5. Root Directory: apps/web
6. Configure Environment Variables (copy from production, use test keys):

| Variable | Value |
|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | pk_test_... |
| CLERK_SECRET_KEY | sk_test_... |
| NEXT_PUBLIC_SUPABASE_URL | https://xxx-staging.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | eyJ... (service_role, NOT anon) |
| STRIPE_SECRET_KEY | sk_test_... |
| STRIPE_WEBHOOK_SECRET | whsec_... |
| OLLAMA_API_KEY | Test/dev key |
| SENTRY_DSN | Staging project DSN |
| NEXT_PUBLIC_POSTHOG_KEY | Staging project key |
| NEXT_PUBLIC_APP_URL | https://clippy-staging.vercel.app |

7. Click Deploy

---

## QA Test Users

| Organisation | Role | Email | Password | Clerk User ID |
|---|---|---|---|---|
| Agency Alpha | Owner | owner.a@clippy-qa.test | [Store in password manager] | [From Clerk dashboard] |
| Agency Alpha | Agent | agent.a@clippy-qa.test | [Store in password manager] | [From Clerk dashboard] |
| Agency Beta | Owner | owner.b@clippy-qa.test | [Store in password manager] | [From Clerk dashboard] |
| Agency Beta | Agent | agent.b@clippy-qa.test | [Store in password manager] | [From Clerk dashboard] |

---

## Test Commands

### Verify Staging Loads
curl -I https://clippy-staging.vercel.app
Expected: HTTP/2 200

### Verify Health Endpoint
curl https://clippy-staging.vercel.app/api/health
Expected: {"status":"ok","version":"1.1.0"}

### Verify Org Isolation
In Supabase staging SQL editor:
SELECT orgs.name, COUNT(leads.id) as lead_count
FROM orgs
LEFT JOIN leads ON leads.org_id = orgs.id
WHERE orgs.slug LIKE 'agency-%'
GROUP BY orgs.id, orgs.name;
Expected: 2 orgs, each with their own leads (no cross-contamination)

### Verify Stripe Test Mode
- Check Stripe dashboard shows test mode badge
- Test checkout with card 4242 4242 4242 4242
- Verify webhook received in Stripe test mode dashboard

---

## Test Data Reset

To reset staging to clean state:

Run in Supabase SQL Editor:
TRUNCATE TABLE leads CASCADE;
TRUNCATE TABLE listings CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE inspection_bookings CASCADE;
TRUNCATE TABLE inspection_time_slots CASCADE;
Then re-run: supabase/staging-seed.sql

---

## Known Limitations (Staging)

| Feature | Status | Notes |
|---|---|---|
| WhatsApp | Manual wa.me link | Not Cloud API integrated |
| Rate Limiting | In-memory | Resets per serverless invocation |
| Email Delivery | SendGrid test mode | Emails go to sandbox or configured test addresses |
| OAuth Callbacks | Test mode only | Google/Facebook apps must use staging callback URLs |

---

## Security Checklist

- .env.local NOT committed to Git
- .vercel/ directory NOT committed
- Supabase service_role key NOT in client code
- Stripe test keys used (not production)
- Clerk test mode enabled
- Separate Supabase project (not production DB)
- GitHub repo is Private
- No production customer data in staging
- Test data clearly labelled (e.g., Test Agency, QA User)

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check Clerk audit logs
4. Review error in Sentry (staging project)

---

**DO NOT:**
- Use production API keys in staging
- Import production database dumps
- Share test user passwords in plain text
- Commit .env* files (except .env.example)
- Run staging migrations on production database
