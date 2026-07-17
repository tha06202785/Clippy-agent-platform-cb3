# ============================================================================
# AI Workflow Documentation
# Clippy AI Copilot — Australian Real Estate Compliance System
# Version 1.0 | 2026-05-18
# ============================================================================

---

## WORKFLOW 1: NEW LEAD INTAKE (All Platforms)

**Trigger:** First message from new lead  
**Goal:** Identify intent, capture details, qualify, save to CRM

```
┌─────────────────────────────────────────────────────────┐
│  1. INBOUND MESSAGE                                     │
│      ↓                                                  │
│  2. SCAN INPUT (Guardrail Stage 1)                     │
│      ├─ RED FLAG → Apply rule (disclaimer/escalate)     │
│      └─ CLEAR → Proceed                                 │
│      ↓                                                  │
│  3. PLATFORM ROUTING                                   │
│      ├─ Facebook → facebook-first-response               │
│      ├─ Email → email-enquiry-response                 │
│      ├─ WhatsApp → whatsapp-first-response             │
│      ├─ Website → website-chat-opening                 │
│      └─ SMS → sms-enquiry-response                    │
│      ↓                                                  │
│  4. LEAD QUALIFICATION FLOW                            │
│      Stage 1: Warm welcome, intent question            │
│      Stage 2: Budget/timeline (if offered — never force)│
│      Stage 3: Property needs                           │
│      ↓                                                  │
│  5. CRM SAVE                                          │
│      name / phone / email / source / intent /          │
│      budget / timeline / hot_flag / notes              │
│      ↓                                                  │
│  6. AGENT ALERT (if hot lead detected)                 │
│      → Structured notification to agent                │
│      → CRM record linked                              │
└─────────────────────────────────────────────────────────┘
```

**Hot Lead Thresholds:**
- Pre-approved + active search → immediately flag
- Needs to move in <30 days → immediately flag
- Property to sell + buying → immediately flag
- "Ready to sign" language → immediately flag

---

## WORKFLOW 2: BUYER INQUIRY RESPONSE

**Trigger:** Lead asks about a property for sale  
**Goal:** Provide facts, drive inspection booking, capture lead

```
1. ACKNOWLEDGE
   "Hey [Name]! Great question about 42 Harbour St."

2. PROVIDE FACTS
   - Beds / baths / parking
   - Key features (only verified facts)
   - Inspection time (if available)
   - Price (only if confirmed — otherwise "contact agent for price")

3. GUARDRAIL CHECK
   - Any price/investment language? → Add disclaimer
   - Any finance language? → Add finance disclaimer

4. CTA
   "Want to book an inspection? Send me a time that works."

5. CRM UPDATE
   - intent: buyer
   - property: [address]
   - stage: enquiry

6. AGENT NOTIFY (if hot lead)
```

---

## WORKFLOW 3: RENTER INQUIRY RESPONSE

**Trigger:** Lead asks about a rental property  
**Goal:** Provide rental info, drive inspection, flag REN-001 rules

```
1. ACKNOWLEDGE
   "Thanks for your enquiry! This rental looks great."

2. PROVIDE RENTAL FACTS
   - Weekly rent
   - Bond (confirm with property manager)
   - Available from date
   - Inspection time

3. GUARDRAIL CHECK
   - "Will I get approved?" → REN-001: Do not assess
   - "Guaranteed bond?" → REN-002: No guarantee
   - Any finance language → Finance disclaimer

4. RENTAL PROCESS EXPLAINER
   - "Applications close [date]"
   - "Your agent can help you submit a strong application"
   - Do NOT promise approval outcomes

5. CTA
   "Want to inspect? Let me know your preferred time."

6. CRM UPDATE
   - intent: renter
   - property: [address]
   - stage: enquiry
```

---

## WORKFLOW 4: INSPECTION FOLLOW-UP

**Trigger:** 24h after attended inspection (no response from lead)  
**Goal:** Re-engage, qualify interest level

```
1. CHECK CRM FOR OUTCOME
   - Did lead leave feedback?
   - Did they express interest?

2. IF NO FEEDBACK:
   "Hey [Name]! How'd you like the property on the weekend? Keen to chat about next steps — the agent's available for a call if you want."

3. IF HOT LEAD INDICATORS:
   "Great news — [Agent] mentioned there's another buyer interested. Might be worth a quick chat?"

4. GUARDRAIL CHECK
   - Any negotiation language → LEG-003 → escalate

5. ROUTE TO NEXT STEPS
   - Keen → connect to agent for offer process
   - Not sure → offer to send comparable listings
   - Not interested → thank and close CRM record
```

---

## WORKFLOW 5: PROPERTY APPRAISAL REQUEST

**Trigger:** Lead requests property value/appraisal  
**Goal:** Collect details, pass to agent for CMA, apply PRO-002 rules

```
1. ACKNOWLEDGE
   "Hey! Great you're thinking about selling."

2. COLLECT DETAILS
   - Address
   - Beds / baths / parking
   - Sell timeline

3. GUARDRAIL CHECK
   - Any value/price estimate? → BLOCK → "I can't estimate value"
   - Redirect to agent for CMA

4. CRM SAVE
   - intent: seller
   - property: [address]
   - stage: appraisal-request

5. AGENT ALERT
   "New appraisal request — [Name] at [address], timeline: [X months]"

6. RESPONSE TO LEAD
   "[Agent Name] will be in touch within [timeframe] to do a full CMA."
```

---

## WORKFLOW 6: COMPLAINT / ESCALATION

**Trigger:** Lead expresses dissatisfaction or requests human  
**Goal:** Acknowledge, empathetically handoff, alert agent

```
1. ACKNOWLEDGE EMPATHETICALLY
   "I'm really sorry you're feeling this way — that's not the experience we want for you."

2. APOLOGIZE IF WARRANTED
   If agent/service failure: "That's absolutely not okay — I want to make this right."

3. IMMEDIATE HANDOFF
   - Notify agent with full context
   - Confirm lead phone number for callback
   - Set expectation: "The agent will call you within [timeframe]"

4. CRM UPDATE
   - flag: complaint
   - urgency: HIGH / URGENT
   - notes: summary of issue
```

---

## WORKFLOW 7: RED FLAG DETECTION LOOP

**Trigger:** Any lead message triggers guardrail rule  
**Goal:** Apply correct response layer per severity

```
┌─────────────────────────────────────────────────────────┐
│  INPUT DETECTED                                         │
│      ↓                                                  │
│  SEVERITY CHECK                                        │
│      ↓                                                  │
│  ┌─────────────┬──────────────────────────────────┐   │
│  │  CRITICAL   │  → BLOCK response                 │   │
│  │             │  → ESCALATE immediately to agent  │   │
│  │             │  → Do not send AI response        │   │
│  ├─────────────┼──────────────────────────────────┤   │
│  │  HIGH       │  → ADD disclaimer to response     │   │
│  │             │  → If already had disclaimer →    │   │
│  │             │    ESCALATE                       │   │
│  ├─────────────┼──────────────────────────────────┤   │
│  │  MEDIUM     │  → TRACK in CRM                   │   │
│  │             │  → Respond with normal flow       │   │
│  ├─────────────┼──────────────────────────────────┤   │
│  │  LOW        │  → PROCEED normally                │   │
│  │             │  → Log for review                 │   │
│  └─────────────┴──────────────────────────────────┘   │
│      ↓                                                  │
│  RESPONSE SENT                                         │
│      ↓                                                  │
│  STAGE 2: RESPONSE GATE (Guardrail Stage 2)            │
│      ├─ BANNED phrase → REWRITE without banned phrase  │
│      └─ RISKY phrase → APPEND disclaimer              │
└─────────────────────────────────────────────────────────┘
```

---

## WORKFLOW 8: HUMAN HANDOFF PROTOCOL

**Trigger:** ESC-001 to ESC-006 conditions met  
**Goal:** Preserve context, notify agent, close loop

```
1. HANDSHAKE MESSAGE TO LEAD
   "I'm connecting you with [Agent Name] right now — they'll reach out within [timeframe]."

2. CONTEXT DOCUMENT (sent to agent)
   - Lead: Name / Phone / Email
   - Platform: [where conversation is happening]
   - Red flag: [category]
   - Urgency: [LOW/MEDIUM/HIGH/URGENT]
   - Hot lead: YES/NO
   - Last 5 messages (full transcript)
   - CRM link: [record URL]

3. CRM UPDATE
   - stage: human-handoff
   - assigned_to: [agent name]
   - handoff_reason: [red flag category]

4. AGENT NOTIFICATION
   - In-app notification (if available)
   - SMS to agent: "[Name] needs a callback — [URGENCY] — [platform] — [one-line summary]"
   - Email digest (batch, every 15 min)

5. CONFIRM TO LEAD (if delay expected)
   "Just to confirm — [Agent Name] will be in touch by [time]. Anything urgent in the meantime?"
```

---

## WORKFLOW 9: LEAD QUALIFICATION FRAMEWORK

**Trigger:** Mid-conversation after warm welcome  
**Goal:** Qualify intent without being pushy

```
QUALIFICATION STAGES:

Stage 0: Identify Platform
- Facebook / Email / WhatsApp / Website / SMS
- Sets tone and response format

Stage 1: Intent Capture (1-2 messages)
"Hi [Name]! What brings you to the market right now?"
- Buyer / Seller / Investor / Renter / Other

Stage 2: Timeline
"Are you looking to move soon, or is this more of a long-term plan?"
- Immediate (<1 month)
- Short-term (1-3 months)
- Medium-term (3-6 months)
- Exploring

Stage 3: Budget / Finance (if offered)
"Have you been pre-approved, or is this still in the early stages?"
- Pre-approved (mark hot)
- In process
- Not started

Stage 4: Property Needs
"What kind of property are you after? Bedrooms, area, anything you have to have?"

Stage 5: Capture & Route
- Save all to CRM
- Alert agent if hot flag triggered
- If not ready: "I'll keep you updated when things come up — no pressure"
```

---

## WORKFLOW 10: PLATFORM-SPECIFICROUTING

```
INBOUND MESSAGE
       ↓
IDENTIFY PLATFORM
       ↓
┌──────────────────────────────────────────────────────┐
│ Facebook Messenger                                  │
│ → Short replies (<150 words)                       │
│ → Use quick replies for options                    │
│ → No phone/email in first reply                    │
│ → CTA: "Book Inspection" / "Ask Agent"            │
├──────────────────────────────────────────────────────┤
│ Email                                              │
│ → Reply within 2 hours (business hours)            │
│ → Subject line: property address                   │
│ → Include agent signature block                   │
│ → Mandatory compliance footer (VIC)               │
│ → CTA: inspection booking or call                 │
├──────────────────────────────────────────────────────┤
│ WhatsApp                                           │
│ → Reply within 2 minutes                           │
│ → Max 3 messages per burst                         │
│ → No attachments without confirmation             │
│ → Escalate formal topics to email                 │
├──────────────────────────────────────────────────────┤
│ Website Chat                                       │
│ → First reply within 5 seconds                     │
│ → Proactive prompts at 60s idle                   │
│ → Exit intent capture at page leave                │
│ → Collect phone if offered                         │
├──────────────────────────────────────────────────────┤
│ SMS (future-ready)                                 │
│ → 160 char limit awareness                         │
│ → No URLs unless requested                         │
│ → Escalate calls to voice                          │
└──────────────────────────────────────────────────────┘
       ↓
CRM SAVE + QUALIFICATION FLOW
       ↓
AGENT ALERT (if hot lead)
```

---

## WORKFLOW 11: COMPLIANCE REVIEW TRIGGER

**Trigger:** Specific patterns that require agent/supervisor review  
**Goal:** Flag compliance issues that aren't red flags but need monitoring

```
MONITORING FLAGS:

1. Same lead triggered 3+ guardrail rules in one session
   → Alert: "Lead [name] may need human review"

2. Agent name mentioned negatively
   → Alert to supervisor

3. Property complaint (condition, neighbour, area)
   → Log for agent review

4. Repeated unanswered questions from lead
   → Suggest handoff

5. Any mention of "lawyer" / "solicitor" / "legal action"
   → Immediate supervisor alert
```

---

*Workflows version 1.0 | Review when new patterns emerge*