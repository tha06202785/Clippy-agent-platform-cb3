# Make.com Workflow Configuration
## Clippy Platform Automation

---

## SCENARIO 1: Lead Capture Automation

**Trigger:** Webhook (New lead from Clippy)

**Steps:**
1. **Webhook** - Receive lead data from Clippy
2. **Router** - Route based on source (email/phone/FB)
3. **Supabase** - Save lead to database
4. **Filter** - Check if hot lead (score > 80)
5. **Slack/Email** - Notify agent if hot
6. **Task** - Create follow-up reminder

**Module Configuration:**

```
Module 1: Webhook
- Webhook URL: https://hook.make.com/[your-webhook-id]
- Method: POST
- Body: JSON

Module 2: Router (Email vs Phone)
- Condition 1: email exists → Email Path
- Condition 2: phone exists → Phone Path
- Else: Unknown Path

Module 3: Supabase - Create Lead
- Connection: Clippy Database
- Table: leads
- Action: Insert
- Fields:
  - org_id: {{1.org_id}}
  - full_name: {{1.full_name}}
  - email: {{1.email}}
  - phone: {{1.phone}}
  - source: {{1.source}}
  - status: "new"

Module 4: Supabase - Create Task
- Table: tasks
- Action: Insert
- Fields:
  - org_id: {{1.org_id}}
  - type: "follow_up_2h"
  - title: "Follow up on new lead"
  - due_at: {{now + 2 hours}}
  - status: "pending"
  - priority: {{if 1.temperature == "hot" then "urgent" else "high"}}

Module 5: Filter - Hot Lead Check
- Condition: {{1.temperature == "hot"}}
- Pass if true

Module 6: Slack - Notify Agent
- Channel: #leads
- Message: 🚨 HOT LEAD: {{1.full_name}} - {{1.email}} - {{1.phone}}

Module 7: Email - Send Alert
- To: {{1.agent_email}}
- Subject: New Hot Lead - {{1.full_name}}
- Body: Lead details...
```

---

## SCENARIO 2: AI Reply Draft Automation

**Trigger:** Schedule (Every 5 minutes) OR Webhook (New message)

**Steps:**
1. **Supabase** - Get unread messages
2. **Filter** - Messages without replies (30+ mins)
3. **HTTP** - Call Clippy AI API
4. **Supabase** - Save draft reply
5. **Email/Slack** - Notify agent to review

**Configuration:**

```
Module 1: Supabase - Get Unread
- Table: messages
- Filter: direction = "in" AND status = "read" AND created_at > {{now - 30 mins}}
- Join: conversations, leads

Module 2: Iterator - Process each message

Module 3: HTTP - Call AI API
- URL: {{your-clippy-api}}/api/ai/draft-reply
- Method: POST
- Headers:
  - Authorization: Bearer {{token}}
- Body:
  {
    "conversation_id": {{2.conversation_id}},
    "tone": "professional"
  }

Module 4: Supabase - Save Draft
- Table: conversations
- Action: Update
- Filter: id = {{2.conversation_id}}
- Fields:
  - ai_draft_reply: {{3.content}}
  - ai_draft_generated_at: {{now}}

Module 5: Slack - Notify Agent
- Message: 🤖 AI drafted reply for {{2.lead_name}}. Review: {{your-clippy-url}}/inbox/{{2.conversation_id}}
```

---

## SCENARIO 3: Facebook Post Automation

**Trigger:** Schedule (Daily at 9 AM) OR Manual

**Steps:**
1. **Supabase** - Get listings needing posts
2. **OpenAI** - Generate content
3. **Facebook** - Post to page
4. **Supabase** - Mark as posted
5. **Email** - Confirm to agent

**Configuration:**

```
Module 1: Supabase - Get Active Listings
- Table: listings
- Filter: status = "active" AND needs_post = true

Module 2: Iterator

Module 3: HTTP - Clippy AI Content Pack
- URL: {{your-clippy-api}}/api/ai/content-pack
- Body:
  {
    "listing_id": {{2.id}},
    "pack_type": "social"
  }

Module 4: Facebook - Create Post
- Connection: Facebook Pages
- Page: {{your-page-id}}
- Message: {{3.content.caption_short}}
- Link: {{2.listing_url}}
- Photo: {{2.featured_image_url}}

Module 5: Supabase - Mark Posted
- Table: tasks
- Action: Insert
- Fields:
  - type: "posted_facebook"
  - listing_id: {{2.id}}
  - external_post_id: {{4.id}}
  - posted_at: {{now}}

Module 6: Email - Confirm
- To: {{2.agent_email}}
- Subject: Posted: {{2.address}}
- Body: Your listing was posted to Facebook...
```

---

## SCENARIO 4: Daily Reminder Automation

**Trigger:** Schedule (Daily at 8:30 AM, user timezone)

**Steps:**
1. **Supabase** - Get tasks due today
2. **Aggregate** - Group by agent
3. **Email** - Send daily summary
4. **Slack** - Post reminders

**Configuration:**

```
Module 1: Supabase - Get Today's Tasks
- Table: tasks
- Filter: due_at = {{today}} AND status = "pending"
- Join: leads, agents

Module 2: Aggregator - Group by Agent
- Group by: agent_id
- Functions:
  - Count: task count
  - List: task titles
  - First: agent_email, agent_name

Module 3: Email - Daily Summary
- To: {{2.agent_email}}
- Subject: Your Clippy Tasks for Today ({{2.count}})
- Body:
  Good morning {{2.agent_name}},
  
  You have {{2.count}} tasks today:
  {{2.list}}
  
  View in Clippy: {{your-clippy-url}}/planner

Module 4: Slack - Reminder
- Channel: @{{2.agent_slack_id}}
- Message: 📋 {{2.count}} tasks today. Check your planner!
```

---

## SETUP INSTRUCTIONS:

### Step 1: Create Make.com Account
1. Go to: https://www.make.com/
2. Sign up (free tier: 1,000 ops/month)
3. Create new organization: "Clippy"

### Step 2: Add Connections
1. **Supabase**:
   - Add connection → Supabase
   - URL: https://mqydieqeybgxtjqogrwh.supabase.co
   - Service Role Key: [YOUR_SERVICE_KEY]

2. **Slack** (optional):
   - Add connection → Slack
   - Authorize workspace

3. **Facebook** (optional):
   - Add connection → Facebook
   - Authorize page

4. **Email**:
   - Add connection → Email
   - SMTP settings or use Make's email

### Step 3: Import Scenarios
1. Create new scenario
2. Import from blueprint (or build from above)
3. Test each module
4. Activate

### Step 4: Webhook Setup
1. In Clippy, add webhook URL from Make
2. Test with sample data
3. Verify data flows

---

## WEBHOOK URLs FOR CLIPPY:

**Scenario 1 (Lead Capture):**
```
https://hook.make.com/[your-unique-id]
```
Add to Clippy → Settings → Integrations → Make.com

**Scenario 2 (New Message):**
```
https://hook.make.com/[your-unique-id-2]
```
Add to Clippy → Settings → Webhooks

---

## TESTING:

1. Create test lead in Clippy
2. Verify webhook fires
3. Check Make.com execution log
4. Verify database updated
5. Check notifications sent

---

**STATUS: CONFIGURATION READY**
**Needs:** Make.com account + connection setup
**Time:** 2-3 hours to configure all scenarios
**Value:** Full automation = 10x productivity

---

**CEO:** Ready to implement once you provide Make.com credentials.
