# Facebook Integration for Clippy

Production-ready Facebook Lead Ads and Page automation system.

## Features

- **Facebook OAuth**: Connect Facebook Pages with secure token exchange
- **Lead Ads Integration**: Real-time webhook processing for new leads
- **AI Auto-Reply**: Intelligent Messenger responses using OpenAI
- **Post Scheduling**: Schedule and publish posts to Facebook Pages
- **Webhook Security**: Signature verification for all events

## Setup Instructions

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add these products:
   - **Facebook Login**
   - **Webhooks**
4. In Settings > Basic, note down:
   - App ID
   - App Secret

### 2. Configure Products

#### Facebook Login
- Add OAuth Redirect URI: `https://api.useclippy.com/api/facebook/callback`
- Enable "Pages Messaging" permission if using Messenger

#### Webhooks
- Add webhook subscription for **Page** object
- Callback URL: `https://api.useclippy.com/webhooks/facebook`
- Verify Token: Same as `FACEBOOK_WEBHOOK_VERIFY_TOKEN` env var
- Subscribe to these fields:
  - `leadgen` - New leads from Lead Ads
  - `messages` - Messenger conversations
  - `feed` - Post comments

### 3. Run Database Migrations

Run the SQL in `database.sql` in your Supabase SQL Editor.

### 4. Set Environment Variables

Add to your `.env` file:

```bash
# Facebook App Credentials
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_random_verify_token
FACEBOOK_API_VERSION=v18.0

# OAuth Redirect
FACEBOOK_REDIRECT_URI=https://api.useclippy.com/api/facebook/callback

# Optional: Custom webhook URL
# FACEBOOK_WEBHOOK_URL=https://api.useclippy.com/webhooks/facebook

# OpenAI (for auto-reply)
OPENAI_API_KEY=your_openai_key
```

### 5. Connect a Facebook Page

1. Go to your app's Facebook settings
2. Click "Add Test Page" or use a real Page
3. Grant these permissions:
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `pages_messaging`
   - `pages_manage_posts`
   - `leads_retrieval`

## API Endpoints

### OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facebook/auth` | Start OAuth flow (requires auth) |
| GET | `/api/facebook/callback` | OAuth callback from Facebook |

### Connection Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facebook/connection` | Get connected Page info |
| POST | `/api/facebook/disconnect` | Disconnect Page |
| PUT | `/api/facebook/settings` | Update auto-reply/post settings |

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facebook/leads` | Get leads (with pagination) |
| GET | `/api/facebook/leads/stats` | Get lead statistics |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facebook/conversations/:senderId` | Get conversation history |
| POST | `/api/facebook/conversations/:senderId/reply` | Send manual reply |
| POST | `/api/facebook/test-ai` | Test AI response |

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/facebook/posts` | Schedule/publish post |
| GET | `/api/facebook/posts` | Get scheduled/published posts |
| PUT | `/api/facebook/posts/:postId` | Update scheduled post |
| DELETE | `/api/facebook/posts/:postId` | Cancel/delete post |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks/facebook` | Webhook verification |
| POST | `/webhooks/facebook` | Receive events |

### Testing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/facebook/test-webhook` | Test webhook processing |
| POST | `/api/facebook/test-lead` | Manually process a lead |

## Database Schema

### facebook_connections
Stores connected Facebook Pages for each user.

### facebook_leads
Stores real leads captured from Facebook Lead Ads with AI qualification.

### facebook_messages
Stores Messenger conversation history.

### facebook_posts
Stores scheduled and published Facebook posts.

### facebook_webhook_events
Audit log for webhook events.

## Webhook Events

### Leadgen (Critical)
Triggered when someone submits a Lead Ad form:
1. Facebook sends webhook with `leadgen_id`
2. System fetches full lead data from Graph API
3. Lead stored in `facebook_leads` table
4. AI qualification runs
5. User notified via email
6. Attempt CRM sync

### Messages
Triggered on Messenger activity:
1. Message stored in `facebook_messages`
2. If auto-reply enabled, AI generates response
3. Reply sent via Messenger API
4. Reply logged in database

### Feed
Triggered on post/comment activity (for future features).

## Frontend Integration

### Connect Facebook Page Button

```javascript
const connectFacebook = async () => {
  const response = await fetch('/api/facebook/auth', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  window.location.href = data.auth_url;
};
```

### Auto-Reply Toggle

```javascript
const toggleAutoReply = async (enabled) => {
  await fetch('/api/facebook/settings', {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ auto_reply_enabled: enabled })
  });
};
```

### Real-Time Leads (WebSocket or Polling)

```javascript
// Polling approach
const pollLeads = async () => {
  const response = await fetch('/api/facebook/leads?limit=10', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.leads;
};
```

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using HMAC-SHA256 signature
2. **Token Security**: Page access tokens are encrypted in database (implement encryption layer)
3. **State Parameter**: OAuth state prevents CSRF attacks
4. **Rate Limiting**: Apply rate limiting to Facebook API endpoints
5. **Token Refresh**: Page tokens don't expire but implement validation

## Testing

### Test OAuth Flow
1. Start server with valid credentials
2. Call `/api/facebook/auth`
3. Complete Facebook OAuth
4. Verify Page appears in `/api/facebook/connection`

### Test Lead Webhook
1. Create Lead Ad in Facebook Ads Manager
2. Submit test lead
3. Verify webhook received at `/webhooks/facebook`
4. Check `facebook_leads` table for new entry

### Test Auto-Reply
1. Enable auto-reply in settings
2. Send message to connected Page via Messenger
3. Verify AI response sent and stored

### Test Post Scheduling
1. Schedule post via `/api/facebook/posts`
2. Wait for scheduled time
3. Verify post published to Facebook
4. Check status in `/api/facebook/posts`

## Troubleshooting

### Webhook Not Receiving Events
- Verify webhook URL is accessible from internet
- Check `FACEBOOK_WEBHOOK_VERIFY_TOKEN` matches
- Ensure Page is subscribed to webhooks
- Check webhook events in `facebook_webhook_events` table

### OAuth Fails
- Verify redirect URI matches exactly (including protocol)
- Check App ID and Secret are correct
- Ensure user has admin access to Page

### Leads Not Processing
- Verify Page access token is valid
- Check `leads_retrieval` permission granted
- Review webhook logs for errors

### Auto-Reply Not Working
- Verify `auto_reply_enabled` is true
- Check OpenAI API key is valid
- Review `facebook_messages` table for errors

## Cron Job for Post Scheduler

Add to crontab to run every minute:

```bash
* * * * * curl -X POST https://api.useclippy.com/api/facebook/scheduler/run -H "Authorization: Bearer ${CRON_SECRET}"
```

Or use a scheduled function in your hosting platform.

## License

Part of Clippy - All rights reserved.
