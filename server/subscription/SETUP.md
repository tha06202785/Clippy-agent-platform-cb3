# Stripe Subscription Setup Guide

Complete setup instructions for the Stripe subscription billing system.

## Prerequisites

- Stripe account (https://stripe.com)
- Supabase project with auth system running
- Node.js server (already set up in `/server`)

## Step 1: Configure Stripe Products

### Option A: Using Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Create products for each tier:

#### Free Plan
- Name: "Free"
- Price: $0.00 (no recurring price needed)
- Description: "Free tier with basic features"

#### Pro Plan
- Name: "Pro"
- Description: "Professional tier with advanced features"
- Create price:
  - Recurring
  - Amount: $29.00
  - Interval: Monthly
- Copy the Price ID (looks like `price_1O...`)

#### Enterprise Plan
- Name: "Enterprise"
- Description: "Enterprise tier with custom limits"
- Create price:
  - Recurring
  - Amount: Custom (e.g., $99.00 or leave for custom quotes)
  - Interval: Monthly
- Copy the Price ID

### Option B: Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Create Pro plan
stripe products create \
  --name="Pro" \
  --description="Professional tier with advanced features"

stripe prices create \
  --product="prod_xxxxx" \
  --unit-amount=2900 \
  --currency=usd \
  --recurring='{"interval": "month"}'
```

## Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs from Stripe Dashboard
PRICE_PRO=price_...
PRICE_ENTERPRISE=price_...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Step 3: Install Dependencies

```bash
cd /root/.openclaw/workspace/server
npm install
```

## Step 4: Run Database Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `/server/subscription/database.sql`
3. Run the SQL to create tables, indexes, and functions

## Step 5: Set Up Stripe Webhooks

### Local Development (using Stripe CLI)

```bash
# Forward webhooks to your local server
stripe listen --forward-to http://localhost:3001/webhooks/stripe

# Copy the webhook signing secret
# webhook signing secret: whsec_xxxxx...
```

Add the webhook secret to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

### Production (Stripe Dashboard)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-domain.com/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to your `.env`

## Step 6: Start the Server

```bash
cd /root/.openclaw/workspace/server
npm start
```

## Testing Checklist

### Test 1: Create Checkout Session
```bash
curl -X POST http://localhost:3001/api/subscription/create-checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'
```

Expected: Returns `sessionId` and `url`

### Test 2: Complete Checkout
1. Use the returned `url` to open Stripe Checkout
2. Use test card: `4242 4242 4242 4242`
3. Any future date, any 3-digit CVC, any ZIP
4. Complete checkout
5. Webhook should update subscription in database

### Test 3: Check Subscription Status
```bash
curl http://localhost:3001/api/subscription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: Returns `tier: "pro"`, `status: "active"`

### Test 4: Usage Limits (Free Tier)
1. Create a test user
2. Try to exceed the 50 leads limit
3. Should get 429 error with upgrade message

### Test 5: Billing Portal
```bash
curl -X POST http://localhost:3001/api/subscription/portal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: Returns `url` to Stripe Customer Portal

### Test 6: Cancel Subscription
```bash
curl -X POST http://localhost:3001/api/subscription/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"immediate": false}'
```

Expected: Subscription set to cancel at period end

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is accessible from internet (use ngrok for local dev)
- Verify webhook secret is correct
- Check server logs for signature verification errors

### Subscription not updating
- Check database connection
- Verify webhook events are being received
- Look at `webhook_events` table for errors

### Usage limits not enforced
- Ensure user has `subscription_tier` set in users table
- Check usage_tracking table has records
- Verify middleware is applied to routes

## API Reference

See `API_REFERENCE.md` for complete endpoint documentation.

## Frontend Integration

See `FRONTEND_EXAMPLES.md` for React/Vue/Angular integration examples.