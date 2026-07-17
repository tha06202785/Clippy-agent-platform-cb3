# Clippy AI Copilot — Compliance System

## Quick Start

```javascript
const ClippyCompliance = require('./clippy-compliance');

// Initialize
const clippy = new ClippyCompliance({
  jurisdiction: 'australia',
  state: 'victoria',
  agency: { name: 'Your Agency', license: 'XXXXXX' },
  platform: 'whatsapp',
  agentName: 'Clippy'
});

// Pre-flight check before AI response
const context = clippy.preFlightCheck({ message: userMessage, lead, platform });

// Inject into your AI call
const aiResponse = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: clippy.systemMasterPrompt() },
    { role: 'system', content: context.systemInstructions },
    ...conversationHistory
  ]
});

// Gate response before sending
const { safeResponse } = clippy.gateResponse({ 
  response: aiResponse, 
  platform,
  replacements: { AGENT_NAME, AGENCY_NAME }
});
```

---

## What's in this package

```
clippy-compliance/
├── clippy-rules.engine.js   ← Core rules engine (import this)
├── SYSTEM.md                ← This file — entry point
├── prompts/
│   ├── system-master.md    ← Full system prompt (load as session prompt)
│   └── platform-prompts.md ← Platform-specific overrides
├── guardrails/
│   ├── escalation-matrix.js   ← Risk scoring + escalation
│   ├── disclaimer-engine.js  ← Auto-insert disclaimers by topic
│   └── content-filter.js     ← Filter banned/risky phrases
├── jurisdiction/
│   └── australia/
│       └── rules.js         ← AU rules (VIC primary)
├── flows/
│   ├── buyer-qualification.js
│   ├── seller-qualification.js
│   ├── rental-inquiry.js
│   ├── inspection-followup.js
│   └── appraisal-request.js
├── platforms/
│   ├── facebook.js, email.js, whatsapp.js, webchat.js, sms.js
├── handoff/
│   ├── handoff-protocol.js
│   └── conversation-history.js
├── examples/
│   └── compliant-conversations.md
├── tests/
│   └── compliance-test-scenarios.md
├── docs/
│   ├── API-INTEGRATION.md
│   └── MULTILINGUAL-EXTENSION.md
└── workflows/
    └── ai-workflows.md
```

---

## API Reference

### `clippy.preFlightCheck({ message, lead, platform })`
Run **before** generating an AI response.

Returns:
- `systemInstructions` — inject into your AI prompt
- `complianceContext` — `{ riskLevel, disclaimers, shouldEscalate, hotLead, agentAlert }`
- `raw` — full scan result

### `clippy.gateResponse({ response, platform, replacements })`
Run **after** getting an AI response, **before** sending to user.

Returns:
- `safeResponse` — filtered + disclaimers added
- `flags` — what was caught/modified
- `disclaimersApplied` — which disclaimers were added

### `clippy.quickCheck(message)`
Lightweight sync check — does this message need compliance handling?

Returns: `{ needsHandling, level, trigger, reason }`

### `clippy.systemMasterPrompt()`
Returns the full system-master.md content for loading as session prompt.

### `clippy.buildSystemInstructions(result)`
Build custom system instructions from a preFlightCheck result.

---

## Guardrail Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Immediate risk | Block + escalate to human |
| HIGH | High risk | Add disclaimer, escalate if repeated |
| MEDIUM | Monitor | Log + flag agent |
| LOW | Normal | Proceed normally |

---

## Disclaimer Types

| Type | Trigger | Example |
|------|---------|---------|
| `price_prediction` | price/value/increase/go up | "I can't predict property prices..." |
| `financial_advice` | invest/return/roi/loan | "This is general info only..." |
| `legal_advice` | contract/legal/clause/section | "I'm not a lawyer..." |
| `rental_criteria` | income/credit/tenant selection | "All applications assessed per anti-discrimination law..." |
| `victoria_legal` | section 32/auction/cooling off | VIC-specific legal notes... |
| `nsw_specific` | section 66/cooling off | NSW-specific legal notes... |
| `general_disclaimer` | Always added on substantive responses | Standard AI disclaimer footer |

---

## Hot Lead Signals

Automatically flags agent when lead says:
- "ready to sign" / "ready to buy" / "can move fast"
- Pre-approved + actively searching
- "Need to move in [ timeframe ]"
- "Auction this Saturday/Sunday"
- "Settlement in X weeks/months"

---

## Jurisdiction

**AU-VIC (primary):** Full coverage  
**AU-NSW, AU-QLD:** Partial — state-specific disclaimers  
**UAE/UK/US:** Skeleton — requires local legal review

---

*Package version: 1.0 | Last updated: 2026-05-18*