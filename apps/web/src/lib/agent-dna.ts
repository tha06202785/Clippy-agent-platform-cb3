import { z } from "zod";

export const AGENT_DNA_SECTION_KEYS = [
  "identity",
  "voice",
  "content",
  "conversion",
  "decisions",
  "client_relationships",
  "operations",
  "idea_expansion",
  "audience_intelligence",
  "growth",
] as const;

export type AgentDnaSectionKey = (typeof AGENT_DNA_SECTION_KEYS)[number];
export type AgentDnaStatus = "needs_input" | "draft" | "confirmed";

export type AgentDnaSection = {
  id: string;
  org_id: string;
  user_id: string;
  section_key: AgentDnaSectionKey;
  summary: string;
  rules: string[];
  goals: string[];
  agent_notes: string;
  source: "recommended" | "inferred" | "agent";
  status: AgentDnaStatus;
  confidence: number;
  evidence_count: number;
  version: number;
  confirmed_at: string | null;
  updated_at: string;
};

export type AgentDnaDefinition = {
  key: AgentDnaSectionKey;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  question: string;
  placeholder: string;
};

export const AGENT_DNA_DEFINITIONS: AgentDnaDefinition[] = [
  {
    key: "identity",
    number: 1,
    title: "Identity Architect",
    shortTitle: "Identity",
    description: "Personality, beliefs, values and professional mindset.",
    question:
      "What should Clippy always understand about who you are and what you stand for?",
    placeholder:
      "Example: I am calm, transparent and practical. I value trust over a quick sale.",
  },
  {
    key: "voice",
    number: 2,
    title: "Voice & Communication",
    shortTitle: "Voice",
    description:
      "Tone, vocabulary, pacing, structure and emotional expression.",
    question: "How should Clippy sound when writing or speaking as you?",
    placeholder:
      "Example: Warm and professional, short paragraphs, one clear next step, Australian English.",
  },
  {
    key: "content",
    number: 3,
    title: "Brand-Aligned Content",
    shortTitle: "Content",
    description: "Brand positioning, preferred topics and content standards.",
    question:
      "What should your content help the audience understand, feel or do?",
    placeholder:
      "Example: Educate Melbourne buyers and vendors with useful local insights, without hype.",
  },
  {
    key: "conversion",
    number: 4,
    title: "Soft-Sell Conversion",
    shortTitle: "Conversion",
    description: "Natural enquiry, objection and follow-up handling.",
    question:
      "How do you guide genuine interest toward the next step without being pushy?",
    placeholder:
      "Example: Clarify intent, answer the real concern, then offer one relevant next action.",
  },
  {
    key: "decisions",
    number: 5,
    title: "Decision-Making Framework",
    shortTitle: "Decisions",
    description:
      "Priorities, risk tolerance, trade-offs and approval boundaries.",
    question:
      "Which filters should Clippy use before recommending or taking an action?",
    placeholder:
      "Example: Verify facts first; protect trust and compliance; ask me before commitments or price advice.",
  },
  {
    key: "client_relationships",
    number: 6,
    title: "Client Relationships",
    shortTitle: "Clients",
    description: "Updates, follow-ups, feedback and expectation-setting.",
    question: "How should clients feel after every interaction with you?",
    placeholder:
      "Example: Heard, clearly informed and confident about what happens next.",
  },
  {
    key: "operations",
    number: 7,
    title: "Daily Operations",
    shortTitle: "Operations",
    description: "Workflows, routines, tools, reviews and priorities.",
    question:
      "What should Clippy organise each day, and what must remain under your approval?",
    placeholder:
      "Example: Prioritise new enquiries, inspection follow-ups and overdue tasks; draft actions for review.",
  },
  {
    key: "idea_expansion",
    number: 8,
    title: "Idea Expansion",
    shortTitle: "Ideas",
    description: "Turning notes and voice memos into polished work.",
    question:
      "What must Clippy preserve when expanding one of your rough ideas?",
    placeholder:
      "Example: Keep my original opinion and intent; improve only clarity, structure and usefulness.",
  },
  {
    key: "audience_intelligence",
    number: 9,
    title: "Audience Intelligence",
    shortTitle: "Audience",
    description: "Audience needs, concerns, questions and engagement signals.",
    question: "Who matters most, and what signals should Clippy watch for?",
    placeholder:
      "Example: Melbourne vendors and buyers; track repeated questions, objections and preferred channels.",
  },
  {
    key: "growth",
    number: 10,
    title: "Long-Term Growth",
    shortTitle: "Growth",
    description: "Positioning, sustainable goals and compounding actions.",
    question: "What long-term outcomes should Clippy optimise for?",
    placeholder:
      "Example: Strong referrals, a trusted personal brand and sustainable agency growth.",
  },
];

const listSchema = z.array(z.string().trim().min(1).max(300)).max(12);

export const saveAgentDnaSectionSchema = z
  .object({
    action: z.literal("save_dna_section"),
    section_key: z.enum(AGENT_DNA_SECTION_KEYS),
    summary: z.string().trim().min(10).max(1500),
    rules: listSchema,
    goals: listSchema,
    agent_notes: z.string().trim().max(2000),
    status: z.enum(["draft", "confirmed"]),
  })
  .strict();

export const buildAgentDnaSchema = z
  .object({ action: z.literal("build_dna") })
  .strict();

type VoiceProfileInput = {
  style_summary?: string | null;
  style_rules?: Record<string, unknown> | null;
  avoid_phrases?: string[] | null;
  learned_sample_count?: number | null;
  confidence_score?: number | null;
};

type SuggestedSection = Omit<
  AgentDnaSection,
  "id" | "org_id" | "user_id" | "confirmed_at" | "updated_at"
>;

const RECOMMENDED: Record<
  Exclude<AgentDnaSectionKey, "voice">,
  Pick<SuggestedSection, "summary" | "rules" | "goals">
> = {
  identity: {
    summary:
      "A trustworthy, practical real-estate professional whose advice should remain clear, human and grounded in verified information.",
    rules: [
      "Protect trust before speed or short-term conversion.",
      "Never claim a personal belief or experience the agent has not confirmed.",
    ],
    goals: [
      "Make the agent's values explicit before this section is activated.",
    ],
  },
  content: {
    summary:
      "Create useful real-estate content with a consistent point of view, clear audience value and no unsupported hype.",
    rules: [
      "Match the confirmed personal brand.",
      "Separate verified market facts from opinion.",
      "End with a relevant next step only when useful.",
    ],
    goals: ["Define the primary audience, locations, topics and platforms."],
  },
  conversion: {
    summary:
      "Turn genuine interest into an appropriate next step through relevance and trust rather than pressure.",
    rules: [
      "Understand intent before recommending an action.",
      "Answer the objection directly.",
      "Offer one natural next step and never manufacture urgency.",
    ],
    goals: [
      "Define preferred calls to action for buyers, vendors, landlords and tenants.",
    ],
  },
  decisions: {
    summary:
      "Evaluate options using verified facts, client impact, compliance, risk and the agent's confirmed priorities.",
    rules: [
      "Verified facts and legal or agency rules always outrank Agent DNA.",
      "Surface uncertainty and trade-offs.",
      "Keep commitments, pricing advice and high-impact actions under human approval.",
    ],
    goals: [
      "Record the agent's risk tolerance and non-negotiable approval boundaries.",
    ],
  },
  client_relationships: {
    summary:
      "Keep clients informed with clear expectations, honest updates and a reliable next step.",
    rules: [
      "Use the client's explicit communication preferences.",
      "Do not overpromise timing, availability or outcomes.",
      "Escalate sensitive, legal or emotionally charged situations.",
    ],
    goals: [
      "Define follow-up frequency and service standards for each client type.",
    ],
  },
  operations: {
    summary:
      "Organise daily work around timely enquiries, follow-ups, appointments and clearly owned tasks.",
    rules: [
      "Prioritise by urgency and client impact.",
      "Show what is overdue or blocked.",
      "Draft consequential actions for approval unless an automation rule explicitly allows them.",
    ],
    goals: ["Connect the agent's preferred tools, routines and review times."],
  },
  idea_expansion: {
    summary:
      "Turn rough notes and voice memos into polished work while preserving the agent's original intent and point of view.",
    rules: [
      "Do not replace the original opinion with generic AI language.",
      "Improve clarity, structure and usefulness.",
      "Flag missing facts instead of inventing them.",
    ],
    goals: ["Define the most-used output formats and channels."],
  },
  audience_intelligence: {
    summary:
      "Use questions, objections and engagement patterns to understand changing audience needs without guessing personal attributes.",
    rules: [
      "Prefer repeated, explicit signals over assumptions.",
      "Keep client-specific data private.",
      "Turn insights into testable messaging ideas.",
    ],
    goals: ["Define priority audiences and the signals that matter for each."],
  },
  growth: {
    summary:
      "Recommend sustainable actions that strengthen positioning, relationships and long-term business value.",
    rules: [
      "Prefer compounding trust and capability over short-term noise.",
      "Connect recommendations to confirmed business goals.",
      "Make cost, risk and effort visible.",
    ],
    goals: ["Record 12-month and 3-year targets before using this section."],
  },
};

export function buildSuggestedAgentDnaSections(
  profile: VoiceProfileInput | null,
): SuggestedSection[] {
  const sampleCount = Math.max(0, Number(profile?.learned_sample_count || 0));
  const confidence = Math.max(
    0,
    Math.min(100, Number(profile?.confidence_score || 0)),
  );
  const styleRules = profile?.style_rules || {};
  const inferredRules = Object.entries(styleRules)
    .filter(([key, value]) => key !== "explicit" && typeof value === "string")
    .map(([, value]) => String(value).slice(0, 300));
  const explicitRules = Array.isArray(styleRules.explicit)
    ? styleRules.explicit
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
    : [];
  const avoidRules = (profile?.avoid_phrases || [])
    .slice(0, 12)
    .map((phrase) => `Never use: ${phrase}`);

  return AGENT_DNA_DEFINITIONS.map((definition) => {
    if (definition.key === "voice") {
      const hasEvidence = sampleCount > 0;
      return {
        section_key: definition.key,
        summary:
          profile?.style_summary ||
          "Clippy needs approved or sent messages before it can suggest your communication voice.",
        rules: [...inferredRules, ...explicitRules, ...avoidRules].slice(0, 12),
        goals: [
          "Review this inferred voice and correct anything that does not sound like you.",
        ],
        agent_notes: "",
        source: hasEvidence ? "inferred" : "recommended",
        status: hasEvidence ? "draft" : "needs_input",
        confidence: hasEvidence ? confidence : 0,
        evidence_count: sampleCount,
        version: 1,
      };
    }

    return {
      section_key: definition.key,
      ...RECOMMENDED[definition.key],
      agent_notes: "",
      source: "recommended",
      status: "needs_input",
      confidence: 0,
      evidence_count: 0,
      version: 1,
    };
  });
}

export function buildConfirmedAgentDnaPrompt(
  sections: Array<
    Pick<
      AgentDnaSection,
      "section_key" | "summary" | "rules" | "goals" | "agent_notes" | "status"
    >
  >,
): string {
  const confirmed = sections.filter(
    (section) => section.status === "confirmed",
  );
  if (!confirmed.length) return "";

  const titleByKey = new Map(
    AGENT_DNA_DEFINITIONS.map((item) => [item.key, item.shortTitle]),
  );
  return [
    "CONFIRMED AGENT DNA",
    "Apply only when relevant. Current user instructions, verified facts, compliance, agency policy and safety rules always take priority.",
    ...confirmed.flatMap((section) => [
      `${titleByKey.get(section.section_key) || section.section_key}: ${section.summary.slice(0, 1_500)}`,
      ...section.rules
        .slice(0, 12)
        .map((rule) => `Confirmed rule: ${rule.slice(0, 300)}`),
      ...section.goals
        .slice(0, 8)
        .map((goal) => `Confirmed goal: ${goal.slice(0, 300)}`),
      ...(section.agent_notes
        ? [`Confirmed private note: ${section.agent_notes.slice(0, 1_000)}`]
        : []),
    ]),
  ]
    .join("\n")
    .slice(0, 12_000);
}

export async function loadConfirmedAgentDnaPrompt(
  supabase: any,
  orgId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("agent_dna_sections")
    .select("section_key,summary,rules,goals,agent_notes,status")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("section_key");
  if (error)
    throw new Error(`Confirmed Agent DNA lookup failed: ${error.message}`);
  return buildConfirmedAgentDnaPrompt(data || []);
}
