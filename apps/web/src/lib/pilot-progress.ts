export const PILOT_DNA_SECTION_TARGET = 10;

export type PilotProgressStepKey =
  | "agent_dna"
  | "gmail"
  | "calendar"
  | "client"
  | "property"
  | "approved_reply";

export type PilotProgressSignals = {
  confirmedDnaSections: number;
  gmailConnected: boolean;
  calendarConnected: boolean;
  clientCount: number;
  propertyCount: number;
  approvedReplyCount: number;
  feedbackCount: number;
};

export type PilotProgressStep = {
  key: PilotProgressStepKey;
  title: string;
  description: string;
  detail: string;
  href: string;
  action: string;
  complete: boolean;
};

export type PilotProgress = {
  completed: number;
  total: number;
  percent: number;
  feedbackCount: number;
  steps: PilotProgressStep[];
};

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function buildPilotProgress(
  input: PilotProgressSignals,
): PilotProgress {
  const signals = {
    ...input,
    confirmedDnaSections: nonNegative(input.confirmedDnaSections),
    clientCount: nonNegative(input.clientCount),
    propertyCount: nonNegative(input.propertyCount),
    approvedReplyCount: nonNegative(input.approvedReplyCount),
    feedbackCount: nonNegative(input.feedbackCount),
  };
  const steps: PilotProgressStep[] = [
    {
      key: "agent_dna",
      title: "Confirm your Agent DNA",
      description:
        "Use the guided templates, adjust anything that does not sound like you, then confirm each section.",
      detail: `${Math.min(signals.confirmedDnaSections, PILOT_DNA_SECTION_TARGET)}/${PILOT_DNA_SECTION_TARGET} sections confirmed`,
      href: "/learning",
      action: "Set up Agent DNA",
      complete: signals.confirmedDnaSections >= PILOT_DNA_SECTION_TARGET,
    },
    {
      key: "gmail",
      title: "Connect Gmail",
      description:
        "Let Clippy work with your client email while keeping every reply approval-controlled.",
      detail: signals.gmailConnected ? "Connected" : "Not connected",
      href: "/integrations",
      action: "Connect Gmail",
      complete: signals.gmailConnected,
    },
    {
      key: "calendar",
      title: "Connect Google Calendar",
      description:
        "Give Clippy the context it needs for appointments and inspections.",
      detail: signals.calendarConnected ? "Connected" : "Not connected",
      href: "/integrations",
      action: "Connect Calendar",
      complete: signals.calendarConnected,
    },
    {
      key: "client",
      title: "Add your first client",
      description:
        "Import a CSV securely or add a client manually. Duplicate contacts are skipped.",
      detail: `${signals.clientCount} client${signals.clientCount === 1 ? "" : "s"}`,
      href: "/import",
      action: "Import clients",
      complete: signals.clientCount > 0,
    },
    {
      key: "property",
      title: "Add your first property",
      description:
        "Add one real property so drafts and inspection work can use the correct context.",
      detail: `${signals.propertyCount} propert${signals.propertyCount === 1 ? "y" : "ies"}`,
      href: "/properties",
      action: "Add a property",
      complete: signals.propertyCount > 0,
    },
    {
      key: "approved_reply",
      title: "Approve your first Clippy reply",
      description:
        "Review and edit a Copilot draft. Approval is recorded, but nothing is sent without your final action.",
      detail: `${signals.approvedReplyCount} approved repl${signals.approvedReplyCount === 1 ? "y" : "ies"}`,
      href: "/copilot",
      action: "Try Clippy",
      complete: signals.approvedReplyCount > 0,
    },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    feedbackCount: signals.feedbackCount,
    steps,
  };
}

export function isConnectedIntegrationStatus(status: string | null): boolean {
  return status === "connected" || status === "healthy";
}
