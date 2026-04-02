# Facebook Webhook Setup - Production Ready
## For Clippy Lead Capture

### Step 1: Create Facebook App (Developer)
1. Go to: https://developers.facebook.com/
2. Create App
3. Select "Business" type
4. Add Product: Webhooks

### Step 2: Configure Webhooks
**Webhook URL:**
```
https://useclippy.com/api/webhooks/facebook
```

**Verify Token:**
```
clippy-webhook-verify
```

**Subscription Fields:**
- `feed` (for comments)
- `messages` (for DMs)

### Step 3: Get Access Token
```
1. Go to: https://developers.facebook.com/tools/explorer
2. Select your app
3. Get Page Access Token
4. Permissions needed:
   - pages_read_engagement
   - pages_messaging
   - pages_manage_metadata
```

### Step 4: Test Webhook
```bash
curl -X POST https://useclippy.com/api/webhooks/facebook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "changes": [{
        "field": "feed",
        "value": {
          "item": "comment",
          "comment_id": "123",
          "from": {"id": "USER_ID", "name": "Test User"},
          "message": "Im interested in this property"
        }
      }]
    }]
  }'
```

### Step 5: Deploy Webhook Handler
Webhook handler already built at:
`/server/facebook_webhook.py`

Endpoints ready:
- `GET /api/webhooks/facebook` - Verification
- `POST /api/webhooks/facebook` - Lead capture

---

## What Happens When Setup:

1. **Lead Comments on FB Post:**
   - Webhook receives event
   - Extracts name, message
   - Creates lead in database
   - Triggers AI reply

2. **Lead Sends DM:**
   - Webhook receives message
   - Creates conversation
   - Adds to Lead Inbox
   - AI suggests reply

3. **Lead Data Captured:**
   - Name from Facebook profile
   - Message content
   - Source: "facebook_comment" or "facebook_message"
   - Creates follow-up task

---

## Status: Ready to Deploy

**Next:** Need Facebook App credentials from user
**Then:** Deploy webhook endpoint
**Test:** Send test comment
**Verify:** Lead appears in Clippy dashboard

---

**CEO Status:** Facebook integration code complete, waiting for credentials
