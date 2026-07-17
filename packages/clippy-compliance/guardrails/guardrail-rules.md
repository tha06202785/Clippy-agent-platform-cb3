# ============================================================================
# AI Guardrail Implementation Logic
# Clippy AI Copilot — Australian Real Estate Compliance System
# Version 1.0 | 2026-05-18
# ============================================================================

## GUARDRAIL ARCHITECTURE

The guardrail system sits between the user's message and the AI response.
It works in 3 stages:

```
Stage 1 → INPUT SCAN     (user message → red flag check)
Stage 2 → RESPONSE GATE  (AI response → risky content check)
Stage 3 → DISCLAIMER     (output → add mandatory disclaimers)
```

---

## GUARDRAIL RULE MATRIX

### Category 1: FINANCIAL / INVESTMENT RISK

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| FIN-001 | "price will go up" / "appreciate" / "gain value" | HIGH | Disclaimer + escalate if pressed |
| FIN-002 | "good investment" / "solid investment" | HIGH | Disclaimer + no prediction |
| FIN-003 | "can I afford" / "should I borrow" / "how much deposit" | HIGH | Finance disclaimer + human contact |
| FIN-004 | "pre-approved" / "approved for finance" / "loan" | MEDIUM | Verify status → provide broker contact |
| FIN-005 | "mortgage" / "interest rate" / "repayments" | HIGH | Disclaimer + broker contact |
| FIN-006 | "rental yield" / "return on investment" / "ROI" | HIGH | Disclaimer — cannot calculate |

### Category 2: LEGAL / CONTRACTUAL RISK

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| LEG-001 | "should I sign" / "can you sign" / "on my behalf" | CRITICAL | Escalate immediately |
| LEG-002 | "is this legal" / "is this normal" / "contract question" | CRITICAL | Escalate to agent/solicitor |
| LEG-003 | "offer" / "make an offer" / "negotiate" | MEDIUM | Add process info → escalate if amount mentioned |
| LEG-004 | "cooling off period" / "subject to finance" | MEDIUM | Explain general concept only → escalate for specifics |
| LEG-005 | "section 32" / "vendor statement" | MEDIUM | Confirm receipt → recommend solicitor review |

### Category 3: DISCRIMINATION / FAIR HOUSING

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| DIS-001 | "is it safe for [demographic]" / "what are the neighbours like" | CRITICAL | Neutral response — do not speculate — escalate |
| DIS-002 | "family-friendly" used as proxy for demographics | HIGH | Describe amenities only — no demographic inference |
| DIS-003 | Questions about existing tenant/resident demographics | CRITICAL | Decline — privacy + fair housing |
| DIS-004 | Rental application discrimination attempts | CRITICAL | Refuse politely — escalate immediately |
| DIS-005 | Questions about crime rates by area | MEDIUM | Provide publicly available stats only — no anecdote |

### Category 4: PROPERTY CONDITION / SAFETY

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| PRO-001 | "asbestos" / "lead paint" / "toxic mold" | HIGH | Confirm if known → escalate if not confirmed |
| PRO-002 | "has there been a death" / "sad事件" / "passed away" | MEDIUM | Disclose if known → otherwise "I don't have that info" |
| PRO-003 | "flood risk" / "fire risk" / "landslide" | MEDIUM | Direct to official reports only — no personal assessment |
| PRO-004 | "structural issues" / "cracks" / "renovation needed" | MEDIUM | Escalate — AI cannot assess property condition |
| PRO-005 | "pests" / "termites" / "rodents" | MEDIUM | Confirm if treated — otherwise "I don't have that info" |

### Category 5: RENTAL PROCESS

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| REN-001 | "will I get approved" / "my chances" / "am I eligible" | HIGH | Decline to assess — explain process only |
| REN-002 | "guaranteed bond" / "bond back" / "get my bond back" | HIGH | No guarantees — explain standard process |
| REN-003 | "previous landlord reference" / "can you call my landlord" | MEDIUM | Direct to application process |
| REN-004 | "can I negotiate rent" / "reduce the rent" | MEDIUM | Note request → escalate to property manager |
| REN-005 | "rent increase" / "lease renewal" | MEDIUM | Note request → escalate to property manager |

### Category 6: ESCALATION TRIGGERS

| Rule ID | Trigger Pattern | Severity | Action |
|---------|----------------|----------|--------|
| ESC-001 | "I need to speak to a human" / "real agent" / "person" | HIGH | Immediate handoff |
| ESC-002 | "I want to complain" / "not happy" / "this is terrible" | HIGH | Immediate handoff + alert agent |
| ESC-003 | "I am a lawyer" / "I'm getting legal advice" | CRITICAL | Immediate handoff |
| ESC-004 | "I'm ready to sign" / "where do I sign" | CRITICAL | Immediate handoff — cannot proceed without agent |
| ESC-005 | Emotional distress indicators | HIGH | Empathetic response → human handoff |
| ESC-006 | Repeated questions after 2+ disclaimers | MEDIUM | Handoff — AI has been insufficient |

---

## DISCLAIMER LIBRARY

Copy these into any response requiring a disclaimer.

### Finance Disclaimer
```
⚠️ Disclaimer: I can't provide financial advice. For questions about borrowing capacity, loans, or mortgage suitability, please consult a licensed mortgage broker or financial advisor. Your agent can connect you with someone trusted if you'd like.
```

### Investment Disclaimer
```
⚠️ Disclaimer: I can't predict investment performance or guarantee rental yields. Property investment involves risk — please seek advice from a licensed financial advisor before making investment decisions.
```

### Legal Disclaimer
```
⚠️ Disclaimer: I'm an AI assistant, not a lawyer. For legal advice about contracts, offers, or property law, please consult a solicitor. Your agent can refer you to one if needed.
```

### General Property Disclaimer
```
Note: Property details are approximate and subject to change. Please verify all information with your solicitor and the agent before acting.
```

### Appraisal Disclaimer
```
⚠️ Disclaimer: I can't provide a property value or appraisal estimate. Your agent can prepare a free Comparative Market Analysis (CMA) — just let them know you're interested and they'll be in touch.
```

### Rental Application Disclaimer
```
⚠️ Disclaimer: Rental applications are assessed by the landlord or property manager — I can't predict outcomes. Your agent can help you understand the process and submit a strong application.
```

### Auction Disclaimer (VIC)
```
⚠️ Disclaimer: All offers for properties at auction are subject to the agent's and vendor's approval. We strongly recommend seeking independent legal and financial advice before bid.
```

---

## INPUT SCAN PSEUDOCODE

```
FUNCTION scanInput(userMessage):
  
  userMessage = lowercase(userMessage)
  
  FOR EACH rule IN guardrailRuleMatrix:
    IF rule.triggerPattern IN userMessage:
      severity = rule.severity
      
      IF severity == CRITICAL:
        RETURN { action: ESCALATE_IMMEDIATE, ruleId: rule.id }
      ELSE IF severity == HIGH:
        IF rule.hadDisclaimer == false:
          RETURN { action: ADD_DISCLAIMER, ruleId: rule.id, disclaimer: rule.disclaimer }
        ELSE:
          RETURN { action: ESCALATE_AFTER_DISCLAIMER, ruleId: rule.id }
      ELSE:
        RETURN { action: TRACK_AND_PROCEED, ruleId: rule.id }
  
  RETURN { action: PROCEED, ruleId: null }
```

---

## RESPONSE GATE PSEUDOCODE

```
FUNCTION gateResponse(responseText):
  
  FOR EACH phrase IN bannedPhraseList:
    IF phrase IN responseText:
      RETURN { action: BLOCK_AND_REWRITE, phrase: phrase }
  
  FOR EACH phrase IN riskyPhraseList:
    IF phrase IN responseText:
      RETURN { action: ADD_DISCLAIMER, phrase: phrase }
  
  RETURN { action: APPROVE }
```

---

## BANNED PHRASES (Never output)

These phrases will NEVER appear in a Clippy response:

```
🚫 "I'll handle it"
🚫 "Don't worry about that"
🚫 "That's guaranteed"
🚫 "The agent will definitely..."
🚫 "This property will..."
🚫 "No problem at all"
🚫 "You should definitely buy this"
🚫 "This is a sure thing"
🚫 "We've already had enquiries"
🚫 "You're the first buyer to..."
🚫 "The owner really wants to sell"
🚫 "I can sign that for you"
🚫 "This price is firm"
🚫 "We can guarantee approval"
🚫 "The market is going to..."
🚫 "This is a hot property"
```

---

## RISKY PHRASES (Require disclaimer if used)

If ANY of these appears in the response, append the relevant disclaimer:

```
⚠️ "investment" → Investment Disclaimer
⚠️ "loan" / "mortgage" / "finance" → Finance Disclaimer
⚠️ "value" / "worth" / "price prediction" → Appraisal Disclaimer
⚠️ "contract" / "legal" → Legal Disclaimer
⚠️ "auction" → Auction Disclaimer (VIC)
⚠️ "rental approval" / "application" → Rental Disclaimer
```

---

## JURISDICTION TAGS

Each rule is tagged for expandability:

```
[jurisdiction: AU-VIC]    — Victorian-specific rules
[jurisdiction: AU-NSW]    — NSW additions
[jurisdiction: AU-ALL]   — All Australian states
[jurisdiction: GLOBAL]   — Universal (privacy, anti-discrimination)
[jurisdiction: UAE]       — UAE expansion (future)
[jurisdiction: UK]       — UK expansion (future)
[jurisdiction: US]       — US expansion (future, RESPA/FHA/TILA)
```

---

## TESTING THE GUARDRAILS

Test each Rule ID with:
1. Direct trigger phrase
2. Synonym/paraphrase of trigger
3. Sarcastic or obfuscated trigger
4. Contextual trigger (within a longer message)
5. Multiple triggers in one message

Log results in: `tests/guardrail-test-log.md`

Expected outcome:
- CRITICAL → BLOCK → human escalation notification sent
- HIGH → DISCLAIMER → response sent with disclaimer → escalate if pressed again
- MEDIUM → TRACK → response sent with tracking flag
- LOW → PROCEED → normal response

---

*Guardrail version: 1.0 | Review when legislation changes or new patterns emerge*