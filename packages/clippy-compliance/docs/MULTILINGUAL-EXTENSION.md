# ============================================================================
# Multilingual Compliance Extension
# Clippy AI Copilot — Australian Real Estate Compliance System
# Version 1.0 | 2026-05-18
# ============================================================================
# Australia is one of the most multicultural nations on earth.
# ~30% of Australians were born overseas, ~22% speak a language other than English at home.
# Common real estate client languages: Mandarin, Cantonese, Arabic, Vietnamese,
# Greek, Italian, Hindi, Tagalog, Spanish, Korean, Tamil, Urdu.
#
# All compliance rules from system-master.md apply regardless of language.
# This file extends the system for multilingual operation.
# ============================================================================

---

## DESIGN PRINCIPLE

**Two modes:**

| Mode | Description |
|------|-------------|
| **Agent Primary** | Agent operates in their language. Lead can write in any language — Clippy detects, translates internally, applies all compliance rules, responds in agent's language (lead sees English). |
| **Lead Native** | Agent selects lead's language. Clippy responds in lead's language. All compliance rules translated and applied. |

**Recommendation for MVP:** Agent Primary mode (simpler to build, agent reviews all translations).

---

## LANGUAGE DETECTION

### Supported Languages (MVP)

| Language | Code | Priority |
|----------|------|----------|
| English | en | Default |
| Mandarin Chinese | zh | 🔴 High — largest non-English speaking group |
| Cantonese | yue | 🔴 High — large Australian community |
| Arabic | ar | 🔴 High — growing community |
| Vietnamese | vi | 🟡 Medium |
| Greek | el | 🟡 Medium |
| Italian | it | 🟡 Medium |
| Hindi | hi | 🟡 Medium |
| Tagalog | tl | 🟡 Medium |
| Spanish | es | 🟢 Standard |
| Korean | ko | 🟢 Standard |
| Tamil | ta | 🟢 Standard |
| Urdu | ur | 🟢 Standard |

### Detection Library

Use for detection: `translate-message` npm package or OpenAI/Fireworks translate API.

Detection trigger:
- If `translateMessage()` confidence > 0.7 → use detected language
- If language is supported AND agent has enabled multilingual → respond in that language
- Otherwise: respond in agent's default language

---

## COMPLIANCE RULES IN MULTILINGUAL CONTEXT

### Core rules apply in ALL languages:

❌ **Never translate these into any language (always keep in English):**
- Legal disclaimers (FIN, LEG, etc.)
- Specific Australian legislation names (ACL, Privacy Act 1988, etc.)
- Property address formats (unless local standard requires it)
- License/registration numbers

❌ **Never translate these phrases (keep in English):**
- "Section 32" — keep as-is, add explanation in lead's language
- "Estate Agent" / "License No." — keep as-is
- "Comparative Market Analysis (CMA)" — explain in lead's language

✅ **Always translate these into lead's language:**
- Warm welcome messages
- Intent qualification questions
- Property feature descriptions
- Inspection booking details
- CTA buttons
- Disclaimer explanations (text, not legal citation)

### Jurisdiction note for multilingual:

Each language block should carry a jurisdiction note:
```
[jurisdiction: AU-VIC] — Victorian rules apply regardless of language
```

---

## MANDATORY TRANSLATION GLOSSARY

When responding in non-English languages, use these standard translations:

### English → Mandarin (Simplified)
| English | Mandarin |
|---------|----------|
| Buyer | 买家 (Mǎijiā) |
| Seller | 卖家 (Màijiā) |
| Renter / Tenant | 租客 (Zūkè) |
| Property | 房产 (Fángchǎn) |
| Inspection | 看房 (Kànfáng) |
| Pre-approval (finance) | 预批 (Yùpī) — add explanation |
| Agent | 房产顾问 (Fángchǎn Gùwèn) |
| Deposit | 定金 (Dìngjīn) |
| Bond | 押金 (Yājīn) |
| Auction | 拍卖 (Pāimài) |
| Offer | 出价 (Chūjià) |
| Disclaimer | 免责声名 (Miǎnzé Shēngmíng) |
| I can't predict property prices | 我无法预测房价走势 (Wǒ wúfǎ yùcè fángjià zǒushì) |
| Consult a solicitor | 请咨询律师 (Qǐng zīxún lǜshī) |
| Cancel anytime | 可随时取消 (Kě suíshí qǔxiāo) |
| 14-day free trial | 14天免费试用 (14 tiān miǎnfèi shìyòng) |
| Satisfaction guarantee | 满意保证 (Mǎnyì Bǎozhèng) |

### English → Arabic
| English | Arabic |
|---------|--------|
| Buyer | مشتري (Mushteri) |
| Seller | بائع (Bā'i') |
| Property | عقار ('Iqār) |
| Inspection | معاينة (Mu'āyana) |
| Agent | وكيل ('Walī) |
| Disclaimer | إخلاء مسؤولية (Ikhla' mas'uliyya) |
| I can't give financial advice | لا أستطيع تقديم نصيحة مالية (Lā 'astaṭī'u taqdeem naseeha maliya) |
| Consult a solicitor | استشر محامي (Istashir mihami) |
| Cancel anytime | إلغاء في أي وقت (Ilgha' fi 'ay waqt) |
| 14-day free trial | تجربة مجانية 14 يوم ( Tajribati mujānīya 14 yawm) |
| Satisfaction guarantee | ضمان满意度 (Daman al-murad) |

### English → Vietnamese
| English | Vietnamese |
|---------|------------|
| Buyer | Người mua |
| Seller | Người bán |
| Property | Bất động sản |
| Inspection | Xem nhà |
| Agent | Đại lý |
| I can't predict price | Tôi không thể dự đoán giá |
| Consult a lawyer | Tham khảo luật sư |
| Cancel anytime | Hủy bất cứ lúc nào |
| 14-day free trial | Dùng thử miễn phí 14 ngày |

### English → Hindi
| English | Hindi |
|---------|--------|
| Buyer | खरीदार (Khareedār) |
| Property | संपत्ति (Sampatti) |
| I can't give financial advice | मैं वित्तीय सलाह नहीं दे सकता |
| Cancel anytime | कभी भी रद्द करें |

### English → Arabic (RTL note)
```
⚠️ RTL NOTE: Arabic is right-to-left. All CTA buttons, disclaimers, and 
structured messages must be rendered RTL. In WhatsApp/Facebook, prepend 
the message with "RTL: " tag so the rendering layer knows to flip.
```

---

## MULTILINGUAL COMPLIANCE WARNINGS

### Warning 1: Numerical formats
- English: $500,000 / 01/05/2026
- Chinese: ¥500,000 or $500,000 (keep AUD format) / 2026-05-01
- Arabic: ٥٠٠٠٠٠$ (use Western numerals — Arabic numerals can confuse)
- Hindi: 5,00,000 (Indian lakh system — use Western format for clarity)

**Decision:** Always use Western numerals (500,000) regardless of language.
Always use AUD ($) for currency.

### Warning 2: Date formats
- Australian standard: DD/MM/YYYY
- Use: "May 1st, 2026" in written English or ISO format: 2026-05-01

### Warning 3: Disclaimer placement in RTL languages
In Arabic/Hebrew, disclaimers should appear at the TOP of the message,
not the bottom — because RTL text is read right-to-left, the last line
is actually the "first" thing read.

```
⚠️ ARABIC DISCLAIMER PLACEMENT:
Start message with:
⚠️ إخلاء مسؤولية: [disclaimer text]
Then body of message.
```

### Warning 4: Tonal adaptation
- Mandarin: Formal in first contact, warm as relationship builds
- Arabic: Very warm and relational — don't rush to transaction
- Vietnamese: Respectful and polite, hierarchy matters
- Greek: Warm, family-oriented tone resonates
- Italian: Expressive, passionate — "maestro!" style works

---

## PLATFORM-SPECIFIC MULTILINGUAL NOTES

### WhatsApp
- Language detection: WhatsApp shows the phone's locale — use as hint
- If lead writes in non-English: respond in their language
- If lead switches language mid-conversation: switch with them

### Facebook Messenger
- May have language set from Facebook profile
- Use as hint for detection

### Email
- Subject line: always in English (international standard)
- Body: in lead's language
- Signature block: always in English with agent details

### SMS
- Character limit in non-Latin scripts: ~70 chars (UTF-16)
- Use Latin script for SMS where possible
- If must use non-Latin: split into multiple messages

---

## COMPLIANCE IN MULTILINGUAL CONTEXT

### The following rules are UNIVERSAL — never break regardless of language:

1. **Never assess rental application likelihood** — in any language
2. **Never provide investment advice or price predictions** — in any language
3. **Never make demographic comments about an area** — in any language
4. **Never guarantee bond returns** — in any language
5. **Never provide legal advice** — in any language
6. **Always include financial disclaimer when finance discussed** — in any language
7. **Always escalate contract/negotiation topics** — in any language

### Translation of disclaimers

Each disclaimer in `guardrail-rules.md` has a translated version below.

**Finance Disclaimer — Mandarin:**
```
⚠️ 免责声名：我无法提供财务建议。关于贷款、抵押能力或还款能力的问题，请咨询持牌抵押经纪人或财务顾问。如需帮助，您的房产顾问可以为您推荐值得信赖的专业人士。
```

**Investment Disclaimer — Arabic:**
```
⚠️ إخلاء مسؤولية: لا أستطيع التنبؤ بأداء الاستثمار أو ضمان عوائد الإيجار. تتضمن جميع استثمارات العقارات مخاطر — يرجى استشارة مستشار مالي مرخص قبل اتخاذ قرارات الاستثمار.
```

---

## LEAD QUALIFICATION — LANGUAGE-SPECIFIC NOTES

### Mandarin / Cantonese clients — cultural notes:
- "Face" (面子) matters — be respectful, never embarrass
- "Guanxi" (关系) — relationship before transaction
- Family involvement is common — expect multiple people in conversation
- Property as investment is culturally significant — investment questions common → guardrail applies harder
- Pre-approval often already arranged — take at face value
- "Feng Shui" questions may come up → neutral response, escalate if not confirmed

**Qualification question adaptation:**
Standard: "What's your budget?"
Mandarin adaptation: "请问您的预算范围是？" (gentle, not pushy — wealth display is sensitive)

### Arabic clients — cultural notes:
- Family involvement common — may be representing family
- Religious considerations (halal/haram) may affect property choices
- "Inshallah" (God willing) — don't pressure timeline
- Women may act on behalf of family — always treat as principal

### Vietnamese clients — cultural notes:
- Community referrals matter — "someone recommended us" is common opener
- Respect for education and professional titles
- "Temporary residence" vs "permanent residence" status may affect finance

### Greek clients — cultural notes:
- Family decisions are collective — expect spouse/family input
- Property inheritance questions may arise → escalate
- "Paros" (πάροικος — diaspora) connection → use community warmth

### Italian clients — cultural notes:
- Aesthetic appreciation of property is high — let them admire first
- Food/ lifestyle connection to area matters in conversation
- "ciao" warmth is appropriate — not overly formal

---

## MULTILINGUAL HOT LEAD FLAGS

Same rules as English — detect and flag:
- "Ready to sign" → flag immediately (any language)
- Pre-approved + active search → flag immediately
- Timeline urgency expressed → flag
- Emotional distress → flag and escalate

In multilingual context: include the original message AND English translation in the agent alert.

---

## HUMAN HANDOFF IN MULTILINGUAL CONTEXT

```
⚠️ HUMAN HANDOFF MUST INCLUDE:
1. Original message in lead's language
2. English translation
3. Detected language code
4. CRM record
5. Agent notification (always in English for agent)
```

Agent handoff message is ALWAYS in English for the agent's benefit.

---

## TECHNICAL IMPLEMENTATION NOTES

### Translation approach options:

**Option A — OpenAI/Fireworks (Recommended MVP)**
- Use `gpt-4o-mini` or similar with system prompt for translation
- Each platform prompt becomes two layers:
  1. Core compliance rules (English — immutable)
  2. Translation layer (lead's language output)

**Option B — Dedicated translation API**
- Google Cloud Translation API
- DeepL API
- Faster, cheaper for high volume

**Option C — Hybrid (recommended for production)**
- Simple phrase translation via lookup table (fast, no API cost)
- Complex sentences via LLM translation
- Compliance rules always in English as backstop

### Implementation priority for MVP:
1. Mandarin (zh) — highest volume non-English speakers
2. Arabic (ar) — fast-growing community
3. Vietnamese (vi) — large established community
4. All others — Phase 2

---

## FILES UPDATED FOR MULTILINGUAL

```
/clippy-compliance/
  prompts/
    system-master.md          ← Added jurisdiction: GLOBAL for anti-discrimination
    platform-prompts.md      ← Platform flows — language detection added
  guardrails/
    guardrail-rules.md       ← Added "all languages" flag per rule
  examples/
    compliant-conversations.md ← Add multilingual examples (Phase 2)
  docs/
    MULTILINGUAL-EXTENSION.md  ← This file
```

---

## JURISDICTION EXPANSION WITH MULTILINGUAL

When expanding to UAE, UK, US:

| Market | Language priorities | Notes |
|--------|--------------------|-------|
| UAE | Arabic (ar), English, Hindi, Urdu, Filipino | Arabic is official — RTL mandatory |
| UK | English primary, Polish, Urdu, Bengali | Large EU pre/post-Brexit communities |
| US | English, Spanish, Mandarin, Vietnamese, Korean | Spanish highest volume |
| India | Hindi, English, Tamil, Telugu, Malayalam | Multiple scripts — Devanagari, Tamil script |

RTL languages to handle: Arabic, Hebrew, Urdu, Persian (Farsi)

---

*Multilingual extension v1.0 | Review quarterly | Update glossary as new community patterns emerge*