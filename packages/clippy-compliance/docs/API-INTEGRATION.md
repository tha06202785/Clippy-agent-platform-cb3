# ============================================================================
# API / Webhook Integration Guide
# Clippy AI Copilot — Australian Real Estate Compliance System
# Version 1.0 | 2026-05-18
# ============================================================================

---

## INTEGRATION OVERVIEW

The Clippy compliance system integrates via the existing Clippy API.
All inbound messages flow through the same `/api/ai/*` routes, with
compliance guardrails applied as a middleware layer.

```
INBOUND PLATFORM MESSAGE
         ↓
  API Gateway / Webhook
         ↓
  Clippy AI Route Handler
         ↓
  ┌────────────────────────────────────┐
  │ COMPLIANCE MIDDLEWARE LAYER        │
  │  1. Guardrail Input Scan          │
  │  2. Language Detection            │
  │  3. CRM Lookup / Create            │
  │  4. Response Generation            │
  │  5. Guardrail Output Gate          │
  │  6. CRM Update                     │
  └────────────────────────────────────┘
         ↓
  Platform-Specific Output
  (Facebook / Email / WhatsApp / Website / SMS)
         ↓
  Agent Notification (if hot lead / escalation)
```

---

## EXISTING API ROUTES (already built)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/reply` | POST | Core AI reply route |
| `/api/ai/qualify-lead` | POST | Lead qualification |
| `/api/leads` | GET/POST | Lead CRUD |
| `/api/conversations` | GET/POST | Conversation history |
| `/api/facebook/webhook` | GET/POST | Facebook Messenger webhook |
| `/api/follow-ups/trigger` | POST | Follow-up automation |

---

## NEW COMPLIANCE ROUTES TO ADD

### Route 1: `/api/ai/compliance/scan`
**Purpose:** Pre-scan a message before sending to AI  
**Method:** POST  
**Input:** `{ message: string, leadId?: string, platform: string }`  
**Output:**

```json
{
  "passed": false,
  "rules": [
    {
      "ruleId": "FIN-001",
      "severity": "HIGH",
      "action": "ADD_DISCLAIMER",
      "disclaimer": "⚠️ Disclaimer: I can't provide financial advice..."
    }
  ],
  "shouldBlock": false,
  "escalateNow": false,
  "language": "en",
  "languageConfidence": 0.99
}
```

**Usage:** Call this before generating any AI response. Apply the returned disclaimers.

---

### Route 2: `/api/ai/compliance/response`
**Purpose:** Process inbound message with full compliance pipeline  
**Method:** POST  
**Input:**

```json
{
  "message": "Do you think this property will go up in value?",
  "lead": {
    "id": "lead_123",
    "name": "Sarah Chen",
    "phone": "+61400000000",
    "source": "facebook"
  },
  "platform": "facebook",
  "propertyId": "prop_456",
  "context": {
    "lastIntent": "buyer_enquiry",
    "propertyAddress": "42 Harbour St, Richmond"
  }
}
```

**Output:**

```json
{
  "response": "Hey Sarah! 42 Harbour St is a great Richmond property...",
  "disclaimers": ["finance"],
  "guardrailApplied": true,
  "leadUpdated": true,
  "agentAlert": null,
  "hotLead": false,
  "language": "en"
}
```

---

### Route 3: `/api/ai/lead/qualify`
**Purpose:** Run lead through qualification flow  
**Method:** POST  
**Input:**

```json
{
  "leadId": "lead_123",
  "answers": [
    { "question": "intent", "answer": "buyer" },
    { "question": "timeline", "answer": "1-3 months" },
    { "question": "preapproval", "answer": "yes" },
    { "question": "budget", "answer": "$800,000-$1M" }
  ]
}
```

**Output:**

```json
{
  "leadId": "lead_123",
  "hotFlag": true,
  "agentAlert": {
    "urgency": "HIGH",
    "message": "Hot buyer lead — pre-approved, 1-3 month timeline, $800K-$1M budget",
    "platform": "facebook",
    "leadId": "lead_123"
  },
  "crmUpdated": true,
  "qualificationStage": "STAGE_4_COMPLETE",
  "nextQuestion": "What suburb are you most interested in?"
}
```

---

### Route 4: `/api/ai/handoff`
**Purpose:** Trigger human handoff with context preservation  
**Method:** POST  
**Input:**

```json
{
  "leadId": "lead_123",
  "conversationId": "conv_789",
  "reason": "LEG-001",
  "reasonDescription": "Lead asked AI to sign contract on their behalf",
  "urgency": "CRITICAL",
  "lastMessages": [
    { "role": "lead", "text": "Can you sign the offer on my behalf?" },
    { "role": "ai", "text": "I've flagged this to the agent..." }
  ],
  "platform": "facebook"
}
```

**Output:**

```json
{
  "handoffId": "handoff_001",
  "agentNotified": true,
  "notificationChannel": ["sms", "in_app"],
  "handoffMessage": "🔔 HUMAN HANDOFF REQUIRED\nUrgency: CRITICAL...",
  "leadStage": "human_handoff",
  "agentAssigned": "agent_jane_doe"
}
```

---

## WEBHOOK STRUCTURE

### Facebook Messenger Webhook

```
POST /api/facebook/webhook

Body (Facebook webhook payload):
{
  "object": "page",
  "entry": [{
    "messaging": [{
      "sender": { "id": "PAGE_SENDER_ID" },
      "recipient": { "id": "PAGE_RECIPIENT_ID" },
      "message": {
        "text": "Hi! Is the Richmond property still available?",
        "mid": "MID123"
      }
    }]
  }]
}

Flow:
1. Receive Facebook webhook
2. Detect language (ML-001)
3. Run compliance scan (FIN-001 check if investment mentioned)
4. Generate response via /api/ai/compliance/response
5. Post to Facebook Messenger API
6. Save lead + conversation to Supabase
```

### WhatsApp Webhook (Twilio)

```
POST /api/whatsapp/webhook

Body (Twilio webhook):
{
  "From": "whatsapp:+61400000000",
  "Body": "Hi! Can I afford this property?",
  "MessageSid": "SMXXXXXXXX"
}

Flow:
1. Receive WhatsApp webhook
2. Language detection
3. Compliance scan
4. Generate response
5. Send via Twilio API
6. Save to Supabase
```

### Website Chat Webhook

```
POST /api/chat/webhook

Body:
{
  "visitorId": "visitor_abc",
  "message": "What's the rental price?",
  "propertyId": "prop_456",
  "sessionId": "chat_session_123"
}

Flow:
1. Session lookup (or create new lead)
2. Compliance scan
3. Generate response
4. Respond via WebSocket/polling
5. Save to Supabase
```

---

## SUPABASE DATABASE UPDATES

### New columns on `leads` table:

```sql
ALTER TABLE leads ADD COLUMN language VARCHAR(10);
ALTER TABLE leads ADD COLUMN hot_flag BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN agent_alert BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN qualification_stage VARCHAR(20);
ALTER TABLE leads ADD COLUMN compliance_flags TEXT[];
ALTER TABLE leads ADD COLUMN last_guardrail_action JSONB;
ALTER TABLE leads ADD COLUMN handoff_reason VARCHAR(100);
```

### New `conversations` columns:

```sql
ALTER TABLE conversations ADD COLUMN guardrail_log JSONB;
ALTER TABLE conversations ADD COLUMN compliance_score FLOAT;
```

### New `compliance_logs` table:

```sql
CREATE TABLE compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  rule_id VARCHAR(20),
  severity VARCHAR(10),
  action VARCHAR(50),
  message_excerpt TEXT,
  response_excerpt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## GUARDRAIL LOG SCHEMA

```json
{
  "logId": "log_abc123",
  "timestamp": "2026-05-18T05:00:00Z",
  "leadId": "lead_123",
  "conversationId": "conv_789",
  "ruleId": "FIN-001",
  "severity": "HIGH",
  "action": "ADD_DISCLAIMER",
  "triggerText": "will go up in value",
  "disclaimerSent": "⚠️ Disclaimer: I can't provide financial advice...",
  "wasEscalated": false,
  "agentAlertSent": false
}
```

---

## AGENT NOTIFICATION FORMAT

### SMS to Agent:
```
🔔 Clippy Alert
Lead: Sarah Chen
Platform: Facebook
Issue: LEG-001 — Lead asked AI to sign contract
Urgency: CRITICAL
Call now: +61400000000
```

### In-App Notification:
```
Human Handoff Required — CRITICAL

Sarah Chen (+61400000000) asked the AI to sign an offer on their behalf.
This is a contractual authority request — immediate human involvement required.

Conversation: [link to CRM]
```

### Email Digest (batched, every 15 min):
```
Subject: [Clippy] Human Handoffs — [Count] requires attention

CRITICAL (1):
- Sarah Chen — LEG-001 — Sign on behalf — Facebook

HIGH (3):
- James Park — FIN-001 — Price prediction x2 — WhatsApp
- Maria Rossi — ESC-002 — Complaint — Email
- ...
```

---

## IMPLEMENTATION CHECKLIST

```
PRE-LAUNCH:
□ Load system-master.md as session system prompt
□ Load platform-prompts.md per route
□ Add compliance middleware to /api/ai/reply
□ Add /api/ai/compliance/scan route
□ Add /api/ai/compliance/response route
□ Add /api/ai/lead/qualify route
□ Add /api/ai/handoff route
□ Add guardrail columns to leads table
□ Add compliance_logs table
□ Add multilingual detection (MVP: Mandarin + Arabic)
□ Run compliance test suite — 100% pass target
□ Agent notification channels tested
□ Hot lead routing tested
□ Human handoff tested

POST-LAUNCH (Week 1):
□ Monitor compliance_logs for unexpected triggers
□ Review false positive rate on guardrails
□ Tune disclaimer frequency based on feedback
□ Agent feedback loop on handoff quality
```

---

*API integration guide v1.0 | Build against existing Clippy routes*
---

## Composio Integration (v1.0 | 2026-05-24)

### Overview
Clippy Compliance System integrates **26 Composio tools** to enable AI agents to perform real estate workflow actions across email, calendar, CRM, documents, and marketing platforms.

### Composio API Key
```
your_composio_api_key
```
Base URL: `https://backend.composio.dev/api/v3.1`

### Toolkits Enabled (26 Tools)

| Category | Toolkit | Tools Count | Purpose |
|----------|---------|-------------|---------|
| **Communication** | `GMAIL` | — | Email client access |
| | `GOOGLECALENDAR` | — | Calendar scheduling |
| | `GOOGLEDRIVE` | — | Document storage |
| | `GOOGLECONTACTS` | — | Contact management |
| | `SLACK` | — | Team messaging |
| | `WHATSAPP` | — | Client messaging |
| | `TELEGRAM` | — | Bot messaging |
| | `DISCORD` | — | Community chat |
| **CRM & Database** | `NOTION` | — | Internal wikis/docs |
| | `AIRTABLE` | — | Structured data |
| | `HUBSPOT` | — | CRM automation |
| | `SALESFORCE` | — | Enterprise CRM |
| **Payments** | `STRIPE` | — | Payment processing |
| | `QUICKBOOKS` | — | Accounting/ invoicing |
| **Marketing** | `MAILCHIMP` | — | Email campaigns |
| | `SENDGRID` | — | Transactional email |
| **Project Mgmt** | `GITHUB` | — | Issue tracking |
| | `JIRA` | — | Sprint management |
| | `LINEAR` | — | Dev planning |
| | `ASANA` | — | Task management |
| | `TRELLO` | — | Board-style planning |
| **Social** | `LINKEDIN` | — | Professional network |
| | `TWITTER` | — | Social announcements |
| | `FACEBOOK` | — | Social media posts |
| | `INSTAGRAM` | — | Visual content |
| **Automation** | `ZAPIER` | — | Workflow automation |
| | `MAKE` | — | Scenario integration |

### Composio Meta Tools (Built-in)

These are always available via Composio session:

| Meta Tool | Purpose |
|-----------|---------|
| `COMPOSIO_SEARCH_TOOLS` | Discover relevant tools across 500+ apps |
| `COMPOSIO_GET_TOOL_SCHEMAS` | Retrieve complete input schemas |
| `COMPOSIO_MULTI_EXECUTE_TOOL` | Execute up to 50 tools in parallel |
| `COMPOSIO_MANAGE_CONNECTIONS` | Handle OAuth/API key authentication |
| `COMPOSIO_REMOTE_WORKBENCH` | Run Python in persistent sandbox |
| `COMPOSIO_REMOTE_BASH_TOOL` | Execute bash commands |

### Integration Check Script

```javascript
const { ComposioCheck } = require('./composio-check');

const check = new ComposioCheck();

// Get connection status for all 26 tools
const status = await check.getToolkitsStatus();
console.log(`Connected: ${status.connected}/${status.totalTools}`);

// Generate integration report
const report = check.generateIntegrationReport();
console.log(report);
```

### Compliance Integration

Composio tools are checked against compliance rules before execution:

```javascript
const ClippyCompliance = require('./index');
const { ComposioCheck } = require('./composio-check');

const clippy = new ClippyCompliance({ ... });
const composio = new ComposioCheck();

// Before executing a Composio tool
const compliance = clippy.preFlightCheck({
  message: `Executing tool: ${toolName}`,
  context: { toolName, action: 'composio_tool' }
});

if (compliance.complianceContext.level !== 'BLOCK') {
  // Proceed with Composio tool execution
  const result = await composio.executeTool(toolName, params);
  // Gate response before sending
  const { safeResponse } = clippy.gateResponse({ response: result });
}
```

### Tool Naming Convention
Composio tools follow `{TOOLKIT}_{ACTION}` pattern:
- `GITHUB_CREATE_ISSUE`
- `GMAIL_SEND_EMAIL`
- `STRIPE_CREATE_PAYMENT_LINK`
- `CALENDAR_CREATE_EVENT`
- `HUBSPOT_CREATE_CONTACT`

### Testing Composio Integration

```bash
cd /root/.openclaw/workspace/clippy-compliance
node composio-check.js
```

### Notes
- All 26 tools are pre-configured with API key auth where required
- OAuth tools (Google, Slack, etc.) use Composio Managed Auth
- Real-time connection status available via `getToolkitsStatus()`
- Tool execution is logged in compliance_logs table
- Rate limits: Composio handles per-tool limits automatically

---

*Composio integration v1.0 | 26 tools | 2026-05-24*
