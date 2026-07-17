# Clippy AI Copilot — Australian Real Estate Compliance System

## 📋 Overview

A complete, production-ready AI compliance system for Australian real estate agents, trained on Australian Consumer Law, Fair Housing principles, and VIC-specific regulations.

> **Goal:** Build a scalable AI real estate copilot for the Australian market that can safely communicate with leads while maintaining compliance and protecting agents/agencies from risky AI-generated responses.

---

## 🗂️ What's Included

```
clippy-compliance/
├── prompts/
│   ├── system-master.md          ← Master system prompt (load at session start)
│   └── platform-prompts.md       ← Platform-specific response layers
├── workflows/
│   └── ai-workflows.md           ← 11 core AI workflows with flowcharts
├── guardrails/
│   └── guardrail-rules.md         ← 30+ guardrail rules with severity + action matrix
├── examples/
│   └── compliant-conversations.md ← 15 annotated example conversations
├── tests/
│   └── compliance-test-scenarios.md ← 30+ test scenarios with pass/fail criteria
└── docs/
    ├── README.md                   ← This file
    ├── MULTILINGUAL-EXTENSION.md  ← Multilingual support (13 languages)
    ├── API-INTEGRATION.md         ← API/webhook integration guide
    └── GUARDRAIL-MATRIX.md        ← Visual guardrail rule reference
```

---

## 🎯 Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Compliance Training** | Australian Consumer Law, Fair Housing, Privacy Act, VIC Estate Agents Act |
| **AI Guardrails** | 30+ rules — red flag detection, disclaimers, escalation |
| **Lead Qualification** | 5-stage compliant qualification framework |
| **Platform Routing** | Facebook, Email, WhatsApp, Website, SMS (future-ready) |
| **Human Handoff** | Context-preserving handoff with urgency tags |
| **Multilingual** | 13 languages with cultural notes (MVP: Mandarin + Arabic) |
| **Human Handoff** | Jurisdiction-agnostic base — expandable to UAE, UK, US |
| **Testing Suite** | 30+ test scenarios with pass/fail criteria |

---

## 🔐 Compliance Coverage

**Australian Laws Covered:**
- Australian Consumer Law (Schedule 2, Competition and Consumer Act 2010)
- Fair Trading Acts (State-based)
- Privacy Act 1988 (Cth) + Australian Privacy Principles (APPs)
- Residential Tenancies Act (VIC) + Residential Tenancies Reform Act 2023
- Estate Agents Act 1980 (VIC)
- National Consumer Credit Protection Act 2009
- Anti-Discrimination Laws (federal + state)

**Guardrail Categories:**
- Financial / Investment Risk (FIN-001 to FIN-006)
- Legal / Contractual Risk (LEG-001 to LEG-005)
- Discrimination / Fair Housing (DIS-001 to DIS-005)
- Property Condition / Safety (PRO-001 to PRO-005)
- Rental Process (REN-001 to REN-005)
- Escalation Triggers (ESC-001 to ESC-006)

---

## 🚀 Quick Start

### 1. Load the System Prompt
Load `prompts/system-master.md` at the start of every AI session.

### 2. Route by Platform
Use `prompts/platform-prompts.md` for the relevant platform layer.

### 3. Run Guardrails
Before every response:
1. Scan input → apply input guardrails
2. Generate response
3. Gate response → block banned phrases, append disclaimers

### 4. Save to CRM
After every lead capture, save to Supabase `leads` table.

### 5. Test Before Going Live
Run `tests/compliance-test-scenarios.md` — aim for 100% pass rate.

---

## 📊 Workflow Summary

| Workflow | Trigger | Goal |
|----------|---------|------|
| New Lead Intake | First message from new lead | Identify intent, save lead, qualify |
| Buyer Enquiry | Question about property for sale | Facts, inspection booking |
| Renter Enquiry | Question about rental property | Rental info, inspection, REN rules |
| Inspection Follow-Up | 24h after attended inspection | Re-engage, qualify interest |
| Appraisal Request | Lead asks for property value | Collect details → agent CMA |
| Complaint/Escalation | Dissatisfaction or "I want human" | Empathetic handoff |
| Red Flag Loop | Guardrail rule triggered | Apply correct response layer |
| Human Handoff | ESC triggers | Preserve context → agent alert |
| Lead Qualification | Mid-conversation | Qualify without pushy |
| Platform Routing | Any inbound message | Route to correct platform layer |
| Compliance Review | Monitoring flags | Flag agent/supervisor issues |

---

## 🌏 Multi-Jurisdiction Expansion

Each rule in the guardrail matrix is tagged by jurisdiction:

```
[jurisdiction: AU-VIC]   ← Victorian-specific
[jurisdiction: AU-NSW]   ← NSW (add when expanding)
[jurisdiction: AU-ALL]   ← Australia-wide
[jurisdiction: GLOBAL]   ← Universal (privacy, anti-discrimination)
[jurisdiction: UAE]      ← UAE (future)
[jurisdiction: UK]       ← UK (future)
[jurisdiction: US]       ← US (future — RESPA/FHA/TILA)
```

**Adding a new market:**
1. Copy `system-master.md` as the base
2. Add jurisdiction-specific blocks
3. Flag any GLOBAL rules that conflict
4. Test against existing guardrail test suite
5. Update jurisdiction tag matrix

---

## 📞 Support

For questions about implementation, compliance interpretation, or training — escalate to a licensed real estate agent or legal counsel.

This system is a **communication tool**, not a **legal advisor**.

---

*System version: 1.0 | Last updated: 2026-05-18 | Review quarterly*