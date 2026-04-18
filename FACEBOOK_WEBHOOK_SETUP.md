# Facebook Webhook Setup - DUAL APPROACH

## OPTION 1: Make.com Direct (FASTEST - USE THIS NOW)

### Step 1: Get Make.com Webhook URL
```
https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb
```

### Step 2: Configure in Facebook Developer Console
1. Go to: https://developers.facebook.com/apps/YOUR_APP_ID/webhooks/
2. Click "Add Subscription" → Select "Page"
3. **Callback URL:** `https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb`
4. **Verify Token:** `clippy-webhook-verify`
5. Click "Verify and Save"

### Step 3: Subscribe to Events
Check these boxes:
- ✅ `messages` (for DMs)
- ✅ `messaging_postbacks`
- ✅ `feed` (for comments)

### Step 4: Subscribe Your Page
1. Go to "Webhooks" → "Page" tab
2. Select your page: "Manpower-Australia"
3. Click "Subscribe"

---

## OPTION 2: Custom Webhook via Netlify (BACKUP)

### Current Issue
Netlify Functions are deploying but the SPA redirect is catching the function URLs.

### URL (when working):
```
https://useclippy.com/.netlify/functions/facebook-webhook
```

### Test Command:
```bash
curl -X GET "https://useclippy.com/.netlify/functions/facebook-webhook?hub.mode=subscribe&hub.verify_token=clippy-webhook-verify&hub.challenge=123456"
```

### Expected Response:
```
123456
```

### Current Response:
HTML page (SPA redirect interfering)

---

## MAKE.COM SCENARIO SETUP

### Scenario 1: Facebook Lead Capture

**Trigger:** Webhook (Custom webhook)
- URL: `https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb`

**Steps:**
1. **Webhook** - Receive Facebook event
2. **Router** - Route by event type (comment vs message)
3. **Supabase** - Insert into `leads` table
   - Table: `leads`
   - Fields to map:
     - `full_name` ← from Facebook name
     - `email` ← from message (extracted)
     - `phone` ← from message (extracted)
     - `source` ← "facebook_comment" or "facebook_message"
     - `message` ← message/comment text
     - `external_id` ← Facebook user ID
     - `status` ← "new"
     - `temperature` ← "hot" for DMs, "warm" for comments
4. **Slack/Email** - Notify agent (optional)

### Scenario 2: Facebook Message Reply

**Trigger:** Webhook
- URL: `https://hook.us2.make.com/immjt2oghud66w5r6p2plp35ssp6spmz`

**Steps:**
1. **Webhook** - Receive message
2. **Supabase** - Create conversation
3. **HTTP** - Call OpenAI for draft reply
4. **Supabase** - Save draft
5. **Email** - Notify agent to review

---

## TESTING

### Test Webhook Verification:
```bash
curl -X GET "https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb?hub.mode=subscribe&hub.verify_token=clippy-webhook-verify&hub.challenge=123456"
```
Should return: `123456`

### Test Lead Capture:
```bash
curl -X POST "https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "changes": [{
        "field": "feed",
        "value": {
          "item": "comment",
          "from": {"id": "123", "name": "Test User"},
          "message": "I am interested in this property. Email me at test@example.com"
        }
      }]
    }]
  }'
```

---

## STATUS

| Component | Status |
|-----------|--------|
| ✅ Facebook Token | Valid (Manpower-Australia) |
| ✅ Make.com Webhooks | Responding (200 OK) |
| ✅ Supabase | Connected |
| ⚠️ Netlify Function | Deployed but redirect issue |
| ⚠️ Custom Webhook | Not accessible yet |

**RECOMMENDATION:** Use Make.com direct for immediate results.

---

## FACEBOOK PERMISSIONS NEEDED

Ensure your Facebook App has:
- `pages_read_engagement`
- `pages_messaging`
- `pages_manage_metadata`
- `lead_retrieval` (for lead forms)

---

**Last Updated:** April 2, 2026
