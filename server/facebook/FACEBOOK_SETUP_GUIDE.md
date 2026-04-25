# Facebook Integration Setup Guide

Complete guide to setting up Facebook Lead Ads and Page automation for Clippy.

## Prerequisites

- Facebook Business Account
- Facebook Page (existing or create new)
- Facebook Developer Account
- A domain with HTTPS (for webhooks)

## Step 1: Create Facebook App

### 1.1 Access Facebook Developers
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account
3. Complete developer registration if prompted

### 1.2 Create New App
1. Click "Create App"
2. Select **"Business"** app type
3. Fill in:
   - **App Name**: Clippy Lead Integration
   - **App Contact Email**: your@email.com
   - **Business Account**: Select your business
4. Click "Create App"

### 1.3 Note App Credentials
1. Go to Settings > Basic
2. Copy these values:
   - **App ID**
   - **App Secret** (click Show)
3. These go in your `.env` file as:
   ```
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

## Step 2: Add Required Products

### 2.1 Add Facebook Login
1. In App Dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Go to Settings > Facebook Login
4. Add Valid OAuth Redirect URIs:
   - Production: `https://api.useclippy.com/api/facebook/callback`
   - Development: `http://localhost:3001/api/facebook/callback`

### 2.2 Configure Webhooks
1. Click "Add Product"
2. Find "Webhooks" and click "Set Up"
3. Select "Page" from the dropdown
4. Click "Subscribe to this object"
5. Enter:
   - **Callback URL**: `https://api.useclippy.com/webhooks/facebook`
   - **Verify Token**: Generate a secure random string (save this!)
6. Click "Verify and Save"
7. Subscribe to these fields:
   - ✅ `leadgen` (for Lead Ads)
   - ✅ `messages` (for Messenger)
   - ✅ `feed` (for comments)

### 2.3 Add Messenger (Optional but Recommended)
1. Click "Add Product"
2. Find "Messenger" and click "Set Up"
3. In Settings > Access Tokens:
   - Select your Facebook Page
   - Generate a Page Access Token
   - Save this token

## Step 3: Configure Your Facebook Page

### 3.1 Page Access Token (Alternative Method)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your App
3. Get User Access Token with permissions:
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `pages_messaging`
   - `leads_retrieval`
4. Exchange for Page Access Token:
   ```
   GET /{page-id}?fields=access_token
   ```

### 3.2 Enable Messaging (for Auto-Reply)
1. Go to your Facebook Page
2. Settings > Messaging
3. Enable "Allow people to message your Page"
4. Set Response Assistant settings
5. Disable Facebook's auto-reply (we handle this)

## Step 4: Create Lead Ad Form

### 4.1 In Facebook Ads Manager
1. Go to [Ads Manager](https://business.facebook.com/adsmanager)
2. Create Campaign > Objective: **Leads**
3. Select your Facebook Page
4. In Ad Set, set Budget & Audience
5. In Ad:
   - Format: Single Image or Carousel
   - Call to Action: **Get Quote** or **Sign Up**
   - Instant Form: Create New

### 4.2 Create Lead Form
1. Click "Create Form"
2. Form Type: **More Volume** (quickest) or **Higher Intent** (adds review step)
3. Add fields you want to capture:
   - Full Name (required)
   - Email (required)
   - Phone Number
   - Custom questions
4. Privacy Policy: Add your URL
5. Complete Setup

### 4.3 Get Form ID
1. Go to your Facebook Page
2. Publishing Tools > Forms Library
3. Click on your form
4. Note the Form ID from the URL

## Step 5: Configure Webhooks

### 5.1 Verify Webhook Setup
Test your webhook is working:

```bash
curl -X GET "https://api.useclippy.com/webhooks/facebook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

Expected response: `test123`

### 5.2 Test Lead Webhook
1. In Facebook Ads Manager
2. Find your Lead Ad
3. Click "Preview"
4. Submit test lead
5. Check your server logs for webhook receipt

## Step 6: Environment Variables

Add these to your `.env` file:

```bash
# Facebook App Credentials
FACEBOOK_APP_ID=your_actual_app_id
FACEBOOK_APP_SECRET=your_actual_app_secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_secure_random_token
FACEBOOK_API_VERSION=v18.0

# URLs (adjust for your environment)
FACEBOOK_REDIRECT_URI=https://api.useclippy.com/api/facebook/callback
FACEBOOK_WEBHOOK_URL=https://api.useclippy.com/webhooks/facebook

# OpenAI (for AI auto-reply)
OPENAI_API_KEY=sk-your_openai_key
```

## Step 7: Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Run the full schema from server/facebook/database.sql
-- Or run the essential parts:

CREATE TABLE IF NOT EXISTS facebook_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    page_name VARCHAR(255),
    page_access_token TEXT NOT NULL,
    instagram_account_id VARCHAR(255),
    webhook_subscribed BOOLEAN DEFAULT false,
    auto_reply_enabled BOOLEAN DEFAULT true,
    auto_post_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, page_id)
);

CREATE TABLE IF NOT EXISTS facebook_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    facebook_lead_id VARCHAR(255) UNIQUE NOT NULL,
    page_id VARCHAR(255),
    form_id VARCHAR(255),
    form_name VARCHAR(255),
    field_data JSONB DEFAULT '{}',
    campaign_id VARCHAR(255),
    ad_id VARCHAR(255),
    created_time TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT false,
    synced_to_crm BOOLEAN DEFAULT false,
    ai_qualified BOOLEAN DEFAULT false,
    ai_qualification_result JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    message TEXT,
    message_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_from_page BOOLEAN DEFAULT false,
    ai_reply_sent BOOLEAN DEFAULT false,
    ai_reply_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    post_id VARCHAR(255),
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    link_url VARCHAR(1000),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    page_id VARCHAR(255),
    payload JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Step 8: Testing

### 8.1 Test OAuth Flow
1. Start your server
2. Login as a user
3. Go to `/api/facebook/auth`
4. Complete Facebook OAuth
5. Verify connection at `/api/facebook/connection`

### 8.2 Test Lead Ads Webhook
1. Create test Lead Ad
2. Submit test lead
3. Check `facebook_leads` table for new entry
4. Check email notification sent
5. Verify AI qualification ran

### 8.3 Test Auto-Reply
1. Enable auto-reply in settings
2. Message your Facebook Page
3. Verify AI response received
4. Check `facebook_messages` table

### 8.4 Test Post Scheduling
1. Schedule post via API
2. Wait for publish time
3. Verify post on Facebook
4. Check `facebook_posts` table

## Troubleshooting

### Webhook Not Working
- Verify URL is publicly accessible
- Check HTTPS is enabled
- Verify webhook token matches exactly
- Check server logs for errors

### OAuth Fails
- Verify redirect URI matches exactly
- Check App ID and Secret are correct
- Ensure user is admin of Facebook Page

### Leads Not Appearing
- Verify `leads_retrieval` permission granted
- Check webhook subscribed to `leadgen` field
- Verify Page access token is valid
- Check server logs for errors

### Auto-Reply Not Working
- Verify `auto_reply_enabled` is true
- Check OpenAI API key is valid
- Verify Messenger webhook subscribed
- Check `facebook_messages` table for errors

## Security Checklist

- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] Tokens encrypted at rest (implement encryption layer)
- [ ] OAuth state parameter used
- [ ] Rate limiting applied
- [ ] HTTPS only (no HTTP)
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries)

## Next Steps

1. Implement token encryption for `page_access_token`
2. Set up cron job for post scheduler
3. Add CRM integration (Salesforce, HubSpot)
4. Add analytics dashboard
5. Implement lead scoring
6. Add Instagram messaging support

## Support

- Facebook Graph API Docs: https://developers.facebook.com/docs/graph-api
- Lead Ads Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads
- Messenger Platform: https://developers.facebook.com/docs/messenger-platform

## Rate Limits

Facebook API has rate limits:
- Page API: 200 calls/hour per Page
- Webhooks: No specific limit
- Lead retrieval: Standard Graph API limits

Monitor your usage in Facebook App Dashboard > Insights > API.
