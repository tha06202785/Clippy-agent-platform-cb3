import type { AgentDnaSectionKey } from "@/lib/agent-dna";

export const AGENT_DNA_ROLE_KEYS = [
  "residential_sales",
  "buyers_agent",
  "property_manager",
  "commercial_leasing",
  "principal",
] as const;

export const AGENT_DNA_VOICE_STYLE_KEYS = [
  "trusted_local",
  "premium_polished",
  "fast_friendly",
  "direct_confident",
  "analytical_advisor",
] as const;

export const AGENT_DNA_RESPONSE_LENGTH_KEYS = [
  "brief",
  "balanced",
  "detailed",
] as const;

export const AGENT_DNA_CONVERSION_STYLE_KEYS = [
  "gentle",
  "consultative",
  "proactive",
] as const;

export const AGENT_DNA_APPROVAL_KEYS = [
  "all_external",
  "commitments_sensitive",
  "agency_automation",
] as const;

export const AGENT_DNA_GROWTH_GOAL_KEYS = [
  "referrals",
  "appointments",
  "personal_brand",
  "client_service",
  "team_scale",
] as const;

export type AgentDnaRole = (typeof AGENT_DNA_ROLE_KEYS)[number];
export type AgentDnaVoiceStyle = (typeof AGENT_DNA_VOICE_STYLE_KEYS)[number];
export type AgentDnaResponseLength =
  (typeof AGENT_DNA_RESPONSE_LENGTH_KEYS)[number];
export type AgentDnaConversionStyle =
  (typeof AGENT_DNA_CONVERSION_STYLE_KEYS)[number];
export type AgentDnaApprovalLevel = (typeof AGENT_DNA_APPROVAL_KEYS)[number];
export type AgentDnaGrowthGoal = (typeof AGENT_DNA_GROWTH_GOAL_KEYS)[number];

export type AgentDnaTemplateChoices = {
  role: AgentDnaRole;
  voice_style: AgentDnaVoiceStyle;
  response_length: AgentDnaResponseLength;
  conversion_style: AgentDnaConversionStyle;
  approval_level: AgentDnaApprovalLevel;
  growth_goal: AgentDnaGrowthGoal;
};

type Option<T extends string> = {
  value: T;
  label: string;
  description: string;
  recommended?: boolean;
};

export const AGENT_DNA_ROLE_OPTIONS: readonly Option<AgentDnaRole>[] = [
  {
    value: "residential_sales",
    label: "Residential sales",
    description: "Vendors, buyers, appraisals and property campaigns.",
    recommended: true,
  },
  {
    value: "buyers_agent",
    label: "Buyer’s agent",
    description: "Owner-occupiers and investors searching and negotiating.",
  },
  {
    value: "property_manager",
    label: "Property manager",
    description: "Rental providers, renters, maintenance and leasing.",
  },
  {
    value: "commercial_leasing",
    label: "Commercial & leasing",
    description: "Owners, occupiers, investors and commercial campaigns.",
  },
  {
    value: "principal",
    label: "Principal or team leader",
    description: "Agency standards, team performance and client growth.",
  },
];

export const AGENT_DNA_VOICE_STYLE_OPTIONS: readonly Option<AgentDnaVoiceStyle>[] =
  [
    {
      value: "trusted_local",
      label: "Trusted local advisor",
      description: "Warm, grounded, community-minded and reassuring.",
      recommended: true,
    },
    {
      value: "premium_polished",
      label: "Premium & polished",
      description: "Refined, composed and service-focused without stiffness.",
    },
    {
      value: "fast_friendly",
      label: "Fast & friendly",
      description: "Conversational, responsive and easy to understand.",
    },
    {
      value: "direct_confident",
      label: "Direct & confident",
      description: "Decisive, concise and action-oriented without pressure.",
    },
    {
      value: "analytical_advisor",
      label: "Analytical advisor",
      description: "Evidence-led, structured and commercially practical.",
    },
  ];

export const AGENT_DNA_RESPONSE_LENGTH_OPTIONS: readonly Option<AgentDnaResponseLength>[] =
  [
    {
      value: "brief",
      label: "Short & focused",
      description: "Answer quickly in a few sentences with one next step.",
    },
    {
      value: "balanced",
      label: "Balanced",
      description: "Give enough context without overwhelming the client.",
      recommended: true,
    },
    {
      value: "detailed",
      label: "Detailed when useful",
      description: "Explain reasoning and options for complex decisions.",
    },
  ];

export const AGENT_DNA_CONVERSION_STYLE_OPTIONS: readonly Option<AgentDnaConversionStyle>[] =
  [
    {
      value: "gentle",
      label: "Gentle advisor",
      description: "Help first and invite the client to choose the next step.",
    },
    {
      value: "consultative",
      label: "Consultative",
      description: "Ask, understand, advise, then suggest one relevant action.",
      recommended: true,
    },
    {
      value: "proactive",
      label: "Proactive",
      description: "Recommend a clear next action promptly, without pressure.",
    },
  ];

export const AGENT_DNA_APPROVAL_OPTIONS: readonly Option<AgentDnaApprovalLevel>[] =
  [
    {
      value: "all_external",
      label: "Review every external action",
      description:
        "Clippy drafts; I approve before anything is sent or booked.",
      recommended: true,
    },
    {
      value: "commitments_sensitive",
      label: "Review sensitive actions",
      description:
        "Require approval for commitments, pricing and risk; routine drafts follow my settings.",
    },
    {
      value: "agency_automation",
      label: "Follow agency automation rules",
      description:
        "Use separately approved agency rules; Agent DNA never grants permission by itself.",
    },
  ];

export const AGENT_DNA_GROWTH_GOAL_OPTIONS: readonly Option<AgentDnaGrowthGoal>[] =
  [
    {
      value: "referrals",
      label: "Referrals & repeat business",
      description: "Build trust that compounds into introductions and loyalty.",
      recommended: true,
    },
    {
      value: "appointments",
      label: "More quality appointments",
      description: "Convert genuine interest into appraisals and meetings.",
    },
    {
      value: "personal_brand",
      label: "Trusted personal brand",
      description: "Become a recognisable, useful local-market voice.",
    },
    {
      value: "client_service",
      label: "Exceptional client service",
      description: "Improve responsiveness, clarity and client confidence.",
    },
    {
      value: "team_scale",
      label: "Scale the team consistently",
      description:
        "Create repeatable standards without losing the human touch.",
    },
  ];

const ROLE_COPY: Record<
  AgentDnaRole,
  {
    identity: string;
    audience: string;
    content: string;
    operations: string;
    clientOutcome: string;
  }
> = {
  residential_sales: {
    identity: "residential property professional guiding vendors and buyers",
    audience: "local vendors, prospective sellers and property buyers",
    content:
      "local-market education, campaign updates and practical vendor and buyer guidance",
    operations:
      "new enquiries, appraisals, inspections, campaign milestones and follow-ups",
    clientOutcome: "well informed, reassured and clear about the next step",
  },
  buyers_agent: {
    identity:
      "buyer’s advocate helping clients search, assess and negotiate with confidence",
    audience: "owner-occupiers and property investors",
    content:
      "search strategy, property assessment, due diligence and negotiation education",
    operations:
      "new briefs, shortlisted properties, due diligence, negotiations and client updates",
    clientOutcome:
      "protected, objectively advised and confident in each decision",
  },
  property_manager: {
    identity:
      "property-management professional balancing service, asset care and fair communication",
    audience: "rental providers, renters and prospective renters",
    content:
      "leasing guidance, property care, regulatory reminders and clear service updates",
    operations:
      "new enquiries, applications, maintenance, inspections, arrears and owner updates",
    clientOutcome:
      "heard, treated fairly and clear about responsibilities and timing",
  },
  commercial_leasing: {
    identity:
      "commercial property advisor connecting property decisions to practical business outcomes",
    audience: "commercial owners, occupiers and investors",
    content:
      "leasing conditions, campaign insights, property positioning and evidence-led market context",
    operations:
      "qualified enquiries, inspections, proposals, negotiations and campaign reporting",
    clientOutcome:
      "commercially informed, respected and clear about material trade-offs",
  },
  principal: {
    identity:
      "real-estate principal setting a trustworthy client experience and consistent team standard",
    audience:
      "clients, prospective clients, referral partners and the agency team",
    content:
      "agency expertise, local leadership, client education and team standards",
    operations:
      "high-value enquiries, escalations, team follow-ups, pipeline health and service risks",
    clientOutcome:
      "confident in the agency, consistently supported and never overpromised",
  },
};

const VOICE_COPY: Record<
  AgentDnaVoiceStyle,
  { summary: string; rules: string[]; contentTone: string }
> = {
  trusted_local: {
    summary:
      "Warm, grounded and reassuring, with the familiarity of a trusted local advisor.",
    rules: [
      "Use natural Australian English and plain language.",
      "Sound helpful and human rather than scripted or overly promotional.",
    ],
    contentTone: "useful, locally relevant and reassuring",
  },
  premium_polished: {
    summary:
      "Polished, composed and attentive, with confident service rather than formality for its own sake.",
    rules: [
      "Use precise language and a calm, considered pace.",
      "Avoid slang, exaggeration and generic luxury clichés.",
    ],
    contentTone: "refined, insightful and quietly confident",
  },
  fast_friendly: {
    summary:
      "Friendly, conversational and responsive, making every message easy to read and act on.",
    rules: [
      "Lead with the answer or acknowledgement.",
      "Prefer short sentences and everyday language without becoming casual in sensitive situations.",
    ],
    contentTone: "clear, upbeat and approachable",
  },
  direct_confident: {
    summary:
      "Direct, concise and confident, with a clear recommendation and no unnecessary pressure.",
    rules: [
      "State the key point early and make the next step unambiguous.",
      "Never confuse confidence with certainty when facts remain unverified.",
    ],
    contentTone: "decisive, practical and action-oriented",
  },
  analytical_advisor: {
    summary:
      "Structured, evidence-led and commercially practical, explaining the reasoning behind advice.",
    rules: [
      "Separate verified evidence, interpretation and recommendation.",
      "Use numbers only when sourced and explain material assumptions.",
    ],
    contentTone: "evidence-led, structured and practical",
  },
};

const LENGTH_RULES: Record<AgentDnaResponseLength, string> = {
  brief:
    "Keep routine replies to a few focused sentences and one clear next step.",
  balanced:
    "Give enough context to be useful, using short paragraphs and one clear next step.",
  detailed:
    "Explain important reasoning and options, but lead with a concise answer and use scannable structure.",
};

const CONVERSION_COPY: Record<
  AgentDnaConversionStyle,
  { summary: string; rules: string[] }
> = {
  gentle: {
    summary:
      "Help first, remove uncertainty and let the client choose whether to take the next step.",
    rules: [
      "Offer an invitation rather than a command.",
      "Do not repeatedly follow up when the client has not shown intent.",
    ],
  },
  consultative: {
    summary:
      "Understand intent, answer the real concern and recommend one relevant next step.",
    rules: [
      "Ask one useful qualifying question when important context is missing.",
      "Connect the next step directly to the client’s stated goal.",
    ],
  },
  proactive: {
    summary:
      "Recommend a clear, timely next action when genuine interest is present, without manufacturing urgency.",
    rules: [
      "Make the recommended action and its benefit explicit.",
      "Use genuine deadlines only when they are verified and relevant.",
    ],
  },
};

const APPROVAL_RULES: Record<AgentDnaApprovalLevel, string[]> = {
  all_external: [
    "Draft every external message, booking or CRM-changing action for my approval before execution.",
    "Preparing a draft never implies permission to send or commit.",
  ],
  commitments_sensitive: [
    "Require my approval for commitments, pricing advice, negotiations, sensitive messages and high-impact CRM changes.",
    "Routine execution must still follow the separate automation permissions configured by my agency.",
  ],
  agency_automation: [
    "Follow only the explicit automation permissions configured separately by my agency.",
    "Agent DNA describes preferences and never grants permission to send, book, promise or change records.",
  ],
};

const GROWTH_COPY: Record<
  AgentDnaGrowthGoal,
  { summary: string; goal: string }
> = {
  referrals: {
    summary:
      "Build trust and service quality that compound into referrals and repeat business.",
    goal: "Create consistent follow-through and natural referral opportunities after delivering value.",
  },
  appointments: {
    summary:
      "Convert well-qualified interest into more useful appraisals, consultations and client meetings.",
    goal: "Increase quality appointments without sacrificing relevance or trust.",
  },
  personal_brand: {
    summary:
      "Build a recognisable personal brand by consistently sharing useful expertise and a clear point of view.",
    goal: "Become a trusted and recognisable voice for the priority market.",
  },
  client_service: {
    summary:
      "Strengthen loyalty through responsive, clear and dependable client service.",
    goal: "Improve client confidence, communication consistency and follow-through.",
  },
  team_scale: {
    summary:
      "Scale a consistent team experience through clear standards, ownership and review.",
    goal: "Create repeatable service standards while preserving human judgement and accountability.",
  },
};

export type AgentDnaTemplateSection = {
  section_key: AgentDnaSectionKey;
  summary: string;
  rules: string[];
  goals: string[];
  agent_notes: string;
  source: "recommended";
  status: "draft";
  confidence: number;
  evidence_count: number;
};

export function buildAgentDnaTemplateSections(
  choices: AgentDnaTemplateChoices,
): AgentDnaTemplateSection[] {
  const role = ROLE_COPY[choices.role];
  const voice = VOICE_COPY[choices.voice_style];
  const conversion = CONVERSION_COPY[choices.conversion_style];
  const approvalRules = APPROVAL_RULES[choices.approval_level];
  const growth = GROWTH_COPY[choices.growth_goal];
  const lengthRule = LENGTH_RULES[choices.response_length];
  const shared = {
    agent_notes: "",
    source: "recommended" as const,
    status: "draft" as const,
    confidence: 0,
    evidence_count: 0,
  };

  return [
    {
      ...shared,
      section_key: "identity",
      summary: `A ${role.identity}. Communication should be ${voice.summary.toLowerCase()}`,
      rules: [
        "Protect trust before speed or short-term conversion.",
        "Never invent personal beliefs, experience, credentials or local knowledge.",
      ],
      goals: [`Help ${role.audience} make informed property decisions.`],
    },
    {
      ...shared,
      section_key: "voice",
      summary: voice.summary,
      rules: [...voice.rules, lengthRule],
      goals: [
        "Make every response sound consistent, natural and recognisably human.",
      ],
    },
    {
      ...shared,
      section_key: "content",
      summary: `Create ${voice.contentTone} content focused on ${role.content}.`,
      rules: [
        "Separate verified market facts from opinion and never use unsupported hype.",
        "Make each piece useful even when the audience takes no immediate action.",
      ],
      goals: [`Build relevance and trust with ${role.audience}.`],
    },
    {
      ...shared,
      section_key: "conversion",
      summary: conversion.summary,
      rules: [
        ...conversion.rules,
        "Never manufacture urgency, scarcity, competition or client intent.",
      ],
      goals: [
        "Turn genuine interest into one appropriate and measurable next step.",
      ],
    },
    {
      ...shared,
      section_key: "decisions",
      summary:
        "Evaluate options using verified facts, client impact, compliance, risk and the agent’s confirmed priorities.",
      rules: [
        "Verified facts, Australian compliance safeguards and agency policy always outrank Agent DNA.",
        "Surface uncertainty and material trade-offs instead of guessing.",
        ...approvalRules,
      ],
      goals: [
        "Make safe, explainable recommendations with clear human accountability.",
      ],
    },
    {
      ...shared,
      section_key: "client_relationships",
      summary: `Help every client feel ${role.clientOutcome}.`,
      rules: [
        "Acknowledge the client’s actual question or concern before adding advice.",
        "Set realistic expectations and never promise timing, availability, price or outcomes without verification.",
        lengthRule,
      ],
      goals: [
        "Build confidence through clear updates and dependable follow-through.",
      ],
    },
    {
      ...shared,
      section_key: "operations",
      summary: `Organise daily work around ${role.operations}.`,
      rules: [
        "Prioritise by urgency, client impact and explicitly agreed deadlines.",
        "Show overdue, blocked and unowned work clearly.",
        ...approvalRules,
      ],
      goals: [
        "Reduce missed follow-ups while keeping ownership and approvals visible.",
      ],
    },
    {
      ...shared,
      section_key: "idea_expansion",
      summary:
        "Turn rough notes and voice messages into polished work without replacing the agent’s original intent or point of view.",
      rules: [
        "Improve clarity, structure and usefulness rather than adding generic AI language.",
        "Flag missing facts and placeholders instead of inventing details.",
        lengthRule,
      ],
      goals: [
        "Create ready-to-review emails, posts, reports and scripts faster.",
      ],
    },
    {
      ...shared,
      section_key: "audience_intelligence",
      summary: `Learn from explicit questions, objections and engagement patterns from ${role.audience}.`,
      rules: [
        "Prefer repeated, explicit signals over assumptions about people.",
        "Keep client-specific and sensitive information private.",
        "Turn insights into testable messaging or service improvements.",
      ],
      goals: [
        "Understand what the priority audience needs, fears and responds to.",
      ],
    },
    {
      ...shared,
      section_key: "growth",
      summary: growth.summary,
      rules: [
        "Prefer sustainable capability, reputation and relationships over short-term noise.",
        "Make the cost, risk, effort and evidence behind recommendations visible.",
      ],
      goals: [growth.goal],
    },
  ];
}

export type AgentDnaPreview = {
  title: string;
  situation: string;
  content: string;
};

const STYLE_PREVIEWS: Record<
  AgentDnaVoiceStyle,
  { enquiry: string; followUp: string; content: string }
> = {
  trusted_local: {
    enquiry:
      "Hi Sarah, thanks for reaching out about 25 Collins Street. I’ll confirm the available Saturday inspection times and come back to you shortly. Is there a time that suits you best?",
    followUp:
      "Hi Sarah, I understand you’re still weighing up your options. I’m happy to talk through the likely campaign steps and answer any questions—there’s no pressure to decide today.",
    content:
      "Thinking of selling? Start with the facts that matter locally: recent comparable results, buyer demand and your timing. A clear plan is more useful than a headline estimate.",
  },
  premium_polished: {
    enquiry:
      "Hi Sarah, thank you for your enquiry regarding 25 Collins Street. I’m confirming Saturday’s available inspection times and will update you shortly. Please let me know if you have a preferred time.",
    followUp:
      "Hi Sarah, I appreciate that selecting the right campaign requires careful consideration. I would be pleased to clarify the strategy, timing and service options whenever convenient for you.",
    content:
      "A well-positioned campaign begins with considered preparation: evidence-led pricing, precise presentation and a strategy aligned with both the property and current buyer demand.",
  },
  fast_friendly: {
    enquiry:
      "Hi Sarah, thanks for your message about 25 Collins Street. I’m checking Saturday’s times now and will get back to you shortly. What time works best?",
    followUp:
      "Hi Sarah, just checking whether any questions came up after our chat. Happy to help when you’re ready—no rush.",
    content:
      "Selling soon? Three things to get clear first: your timing, recent local sales and how buyers are responding right now. Start there before choosing a campaign plan.",
  },
  direct_confident: {
    enquiry:
      "Hi Sarah, I’m confirming the Saturday inspection options for 25 Collins Street now. Send me your preferred time and I’ll match it to the available slots.",
    followUp:
      "Hi Sarah, the next useful step is to compare the campaign options against your timing and priorities. I can take you through that in a short call when you’re ready.",
    content:
      "Before launching a campaign, verify three things: comparable sales, current buyer demand and your ideal timing. Those facts should drive the strategy—not hype.",
  },
  analytical_advisor: {
    enquiry:
      "Hi Sarah, thank you for your enquiry about 25 Collins Street. I’m checking the verified Saturday inspection schedule and will send the available options shortly. Do you have a preferred time window?",
    followUp:
      "Hi Sarah, before deciding, it may help to compare the campaign options across timing, likely cost and buyer reach. I can prepare that comparison and explain the assumptions involved.",
    content:
      "A useful campaign recommendation should connect three evidence points: relevant comparable sales, active buyer demand and the vendor’s timing. Assumptions should be stated—not hidden.",
  },
};

export function buildAgentDnaPreviews(
  choices: AgentDnaTemplateChoices,
): AgentDnaPreview[] {
  const preview = STYLE_PREVIEWS[choices.voice_style];
  return [
    {
      title: "New property enquiry",
      situation: "A buyer asks for a Saturday inspection.",
      content: preview.enquiry,
    },
    {
      title: "Hesitant client follow-up",
      situation: "A client is interested but not ready to decide.",
      content: preview.followUp,
    },
    {
      title: "Educational social post",
      situation: "A useful post for prospective clients.",
      content: preview.content,
    },
  ];
}
