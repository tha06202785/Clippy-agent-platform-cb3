# Clippy AI Compliance System

Production-ready AI compliance layer for Australian real estate communications.

## Overview

Clippy is an AI copilot for real estate agencies that handles client communications across Facebook Messenger, Email, WhatsApp, Website chat, and SMS. This compliance system ensures all AI-generated responses adhere to Australian real estate regulations and professional standards.

## System Architecture

```
clippy-compliance/
├── SYSTEM.md              ← Master compliance prompt (prepended to every AI conversation)
├── GUARDRAILS.md          ← Guardrail documentation + escalation rules
├── clippy-rules.engine.js ← Core rules engine combining all guardrails
├── guardrails/            ← Reusable guardrail modules
│   ├── escalation-matrix.js    ← Risk scoring + escalation logic
│   ├── disclaimer-engine.js    ← Auto-insert disclaimers by topic
│   └── content-filter.js       ← Filters risky/non-compliant wording
├── flows/                 ← Conversation flows (state machines)
│   ├── buyer-qualification.js
│   ├── seller-qualification.js
│   ├── rental-inquiry.js
│   ├── inspection-followup.js
│   └── appraisal-request.js
├── platforms/            ← Platform-specific behavior
│   ├── facebook.js, email.js, whatsapp.js, webchat.js, sms.js
├── jurisdiction/         ← Market-specific rules (extensible)
│   ├── australia/        ← AU rules (Victoria first, others partial)
│   ├── uae.js, uk.js, us.js  ← Placeholder skeletons
├── handoff/               ← Human handoff logic
├── examples/              ← Compliant + non-compliant examples
├── testing/               ← Test scenarios + checklists
└── docs/                  ← API integration + workflow docs
```

## Quick Start

1. **Install as dependency**: `npm install clippy-compliance`
2. **Import the rules engine** in your AI service
3. **Prepend SYSTEM.md** content to your system prompt
4. **Route guardrails** through `clippy-rules.engine.js` before any response

## Configuration

```javascript
const ClippyCompliance = require('./clippy-compliance');

const config = {
  jurisdiction: 'australia',
  state: 'victoria',
  agency: {
    name: 'Your Agency Name',
    license: 'XXXXXX'
  },
  platform: 'whatsapp', // facebook, email, whatsapp, webchat, sms
  agentName: 'Clippy'
};

const clippy = new ClippyCompliance(config);
```

## Jurisdiction Support

| Market  | Status       | Notes |
|---------|--------------|-------|
| Australia (VIC) | ✅ Full | Victoria residential/commercial |
| Australia (NSW) | 🟡 Partial | Partial coverage, verify before deploy |
| Australia (QLD) | 🟡 Partial | Partial coverage, verify before deploy |
| UAE | 🟡 Skeleton | Requires local legal review |
| UK | 🟡 Skeleton | Requires local legal review |
| US | 🟡 Skeleton | Requires local legal review |

## Guardrails Overview

The system implements 5 guardrail layers:

1. **Content Filter** — Blocks prohibited terms/phrases
2. **Disclaimer Engine** — Auto-inserts required disclosures
3. **Escalation Matrix** — Scores risk and triggers handoffs
4. **Jurisdiction Rules** — Market-specific compliance
5. **Platform Optimizations** — Channel-specific behavior

## Key Compliance Rules

### Australian Consumer Law (ACL)
- No misleading or deceptive statements
- No false promises or guarantees
- Clear, factual language only

### Privacy Act 1988
- Collect only necessary data
- Obtain clear consent
- No sharing without permission

### Fair Housing
- Anti-discrimination language
- Inclusive responses regardless of protected characteristics
- No preference expressions based on protected classes

### Financial/Legal Advice
- Never provide investment advice
- Never guarantee outcomes
- Always recommend qualified professionals for legal/financial matters

## Adding New Jurisdictions

1. Copy `jurisdiction/uae.js` as template
2. Research local real estate regulations
3. Replace TODO comments with actual rules
4. Add jurisdiction to `clippy-rules.engine.js`
5. Test with jurisdiction-specific test cases

## Testing

Run compliance tests:
```bash
node testing/run-tests.js
```

See `testing/test-scenarios.md` for test case definitions.

## Composio Integration (26 Tools)

Clippy integrates 26 Composio tools for AI agent workflows:

| Category | Tools |
|----------|-------|
| **Communication** | Gmail, Google Calendar, Google Drive, Google Contacts, Slack, WhatsApp, Telegram, Discord |
| **CRM & Database** | Notion, Airtable, HubSpot, Salesforce |
| **Payments** | Stripe, QuickBooks |
| **Marketing** | Mailchimp, SendGrid |
| **Project Mgmt** | GitHub, Jira, Linear, Asana, Trello |
| **Social** | LinkedIn, Twitter, Facebook, Instagram |
| **Automation** | Zapier, Make |

**Meta Tools Available:**
- `COMPOSIO_SEARCH_TOOLS` — Discover tools across 500+ apps
- `COMPOSIO_GET_TOOL_SCHEMAS` — Retrieve input schemas
- `COMPOSIO_MULTI_EXECUTE_TOOL` — Execute up to 50 tools in parallel
- `COMPOSIO_MANAGE_CONNECTIONS` — Handle authentication
- `COMPOSIO_REMOTE_WORKBENCH` — Python sandbox
- `COMPOSIO_REMOTE_BASH_TOOL` — Bash commands

```javascript
const { ComposioCheck } = require('./composio-check');
const status = await new ComposioCheck().getToolkitsStatus();
```

## API Integration

See `docs/api-integration.md` for webhook and API integration details.

---

**License**: Proprietary — Clippy (useclippy.com)
**Version**: 1.0.0
**Last Updated**: 2026-05-24