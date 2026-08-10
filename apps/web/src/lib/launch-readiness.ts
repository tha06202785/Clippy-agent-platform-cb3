export type LaunchReadinessInput = {
  profileComplete: boolean;
  crmSelected: boolean;
  importComplete: boolean;
  knowledgeCount: number;
  connectedChannels: number;
  clientCount: number;
  propertyCount: number;
  approvedDraftCount: number;
  calendarConnected: boolean;
  reminderCount: number;
};

export type LaunchReadinessStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  action: string;
  complete: boolean;
};

export function buildLaunchReadiness(
  input: LaunchReadinessInput,
): { score: number; completed: number; steps: LaunchReadinessStep[] } {
  const steps: LaunchReadinessStep[] = [
    {
      key: "profile",
      title: "Agency profile",
      description: "Agency identity, market and working preferences are saved.",
      href: "/onboarding",
      action: "Complete profile",
      complete: input.profileComplete,
    },
    {
      key: "crm",
      title: "CRM selection and import",
      description: "A CRM is selected and the first duplicate-safe import is complete.",
      href: "/import",
      action: input.crmSelected ? "Import CRM data" : "Select a CRM",
      complete: input.crmSelected && input.importComplete,
    },
    {
      key: "knowledge",
      title: "Agency knowledge",
      description: `${input.knowledgeCount} approved knowledge item${input.knowledgeCount === 1 ? "" : "s"} available to Clippy.`,
      href: "/knowledge",
      action: "Add agency knowledge",
      complete: input.knowledgeCount > 0,
    },
    {
      key: "channels",
      title: "Communication channels",
      description: `${input.connectedChannels} channel${input.connectedChannels === 1 ? "" : "s"} connected and healthy.`,
      href: "/integrations",
      action: "Connect a channel",
      complete: input.connectedChannels > 0,
    },
    {
      key: "client",
      title: "First client",
      description: `${input.clientCount} client${input.clientCount === 1 ? "" : "s"} ready for Client 360.`,
      href: "/clients",
      action: "Add or import a client",
      complete: input.clientCount > 0,
    },
    {
      key: "property",
      title: "First property",
      description: `${input.propertyCount} propert${input.propertyCount === 1 ? "y" : "ies"} available for contextual conversations.`,
      href: "/inspections",
      action: "Add or import a property",
      complete: input.propertyCount > 0,
    },
    {
      key: "copilot",
      title: "Copilot approval test",
      description: `${input.approvedDraftCount} Copilot draft${input.approvedDraftCount === 1 ? "" : "s"} approved by a human.`,
      href: "/copilot",
      action: "Draft and approve a reply",
      complete: input.approvedDraftCount > 0,
    },
    {
      key: "calendar",
      title: "Calendar and reminders",
      description: input.calendarConnected
        ? `${input.reminderCount} reminder${input.reminderCount === 1 ? "" : "s"} configured.`
        : "Google Calendar is not connected yet.",
      href: input.calendarConnected ? "/calendar" : "/integrations",
      action: input.calendarConnected ? "Create a reminder" : "Connect Calendar",
      complete: input.calendarConnected && input.reminderCount > 0,
    },
  ];

  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    score: Math.round((completed / steps.length) * 100),
    steps,
  };
}
