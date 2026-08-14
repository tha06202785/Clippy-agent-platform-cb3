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
  calendarHealthy: boolean;
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

export type ProductionProofInput = {
  gmailConnected: boolean;
  gmailHealthy: boolean;
  calendarConnected: boolean;
  calendarHealthy: boolean;
  inboundEmailCount: number;
  linkedGmailEnquiryCount: number;
  approvedEmailDraftCount: number;
  deliveredApprovedEmailCount: number;
  confirmedBookingCount: number;
  syncedCalendarBookingCount: number;
  confirmationSentCount: number;
  reminder24hCount: number;
  reminder2hCount: number;
  gmailActivityCount: number;
  replyActivityCount: number;
  bookingActivityCount: number;
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
      description: !input.calendarConnected
        ? "Google Calendar is not connected yet."
        : !input.calendarHealthy
          ? "Google Calendar is connected, but its latest sync failed."
          : `${input.reminderCount} reminder${input.reminderCount === 1 ? "" : "s"} configured.`,
      href:
        input.calendarConnected && input.calendarHealthy
          ? "/calendar"
          : "/integrations",
      action: !input.calendarConnected
        ? "Connect Calendar"
        : input.calendarHealthy
          ? "Create a reminder"
          : "Repair Calendar sync",
      complete:
        input.calendarConnected &&
        input.calendarHealthy &&
        input.reminderCount > 0,
    },
  ];

  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    score: Math.round((completed / steps.length) * 100),
    steps,
  };
}

export function buildProductionProof(
  input: ProductionProofInput,
): { score: number; completed: number; steps: LaunchReadinessStep[] } {
  const recordedActivityTypes = [
    input.gmailActivityCount,
    input.replyActivityCount,
    input.bookingActivityCount,
  ].filter((count) => count > 0).length;
  const steps: LaunchReadinessStep[] = [
    {
      key: "gmail-intake",
      title: "Real Gmail enquiry captured",
      description: !input.gmailConnected
        ? "Gmail must be connected before Clippy can verify a real enquiry."
        : !input.gmailHealthy
          ? "Gmail is connected, but its latest production sync failed."
          : `${input.inboundEmailCount} inbound Gmail message${input.inboundEmailCount === 1 ? "" : "s"} imported into Clippy.`,
      href:
        input.gmailConnected && input.gmailHealthy
          ? "/inbox"
          : "/integrations",
      action: !input.gmailConnected
        ? "Connect Gmail"
        : input.gmailHealthy
          ? "Review Gmail inbox"
          : "Repair Gmail sync",
      complete:
        input.gmailConnected &&
        input.gmailHealthy &&
        input.inboundEmailCount > 0,
    },
    {
      key: "enquiry-context",
      title: "Client and property context linked",
      description: `${input.linkedGmailEnquiryCount} Gmail enquir${input.linkedGmailEnquiryCount === 1 ? "y" : "ies"} linked to a client and property.`,
      href: "/inbox",
      action: "Link a property enquiry",
      complete: input.linkedGmailEnquiryCount > 0,
    },
    {
      key: "approved-delivery",
      title: "Approved reply delivered",
      description: `${input.approvedEmailDraftCount} email draft${input.approvedEmailDraftCount === 1 ? "" : "s"} approved and ${input.deliveredApprovedEmailCount} verified deliver${input.deliveredApprovedEmailCount === 1 ? "y" : "ies"}.`,
      href: "/inbox",
      action: "Approve and send a reply",
      complete:
        input.approvedEmailDraftCount > 0 &&
        input.deliveredApprovedEmailCount > 0,
    },
    {
      key: "booking-calendar",
      title: "Inspection and Calendar verified",
      description: !input.calendarConnected
        ? "Google Calendar must be connected before a booking can be verified."
        : !input.calendarHealthy
          ? "Google Calendar is connected, but its latest production sync failed."
          : `${input.confirmedBookingCount} confirmed booking${input.confirmedBookingCount === 1 ? "" : "s"}; ${input.syncedCalendarBookingCount} synced to Google Calendar.`,
      href:
        input.calendarConnected && input.calendarHealthy
          ? "/inspections"
          : "/integrations",
      action: !input.calendarConnected
        ? "Connect Calendar"
        : input.calendarHealthy
          ? "Complete a test booking"
          : "Repair Calendar sync",
      complete:
        input.calendarConnected &&
        input.calendarHealthy &&
        input.confirmedBookingCount > 0 &&
        input.syncedCalendarBookingCount > 0,
    },
    {
      key: "client-reminders",
      title: "Confirmation and reminders ready",
      description: `${input.confirmationSentCount} confirmation${input.confirmationSentCount === 1 ? "" : "s"} sent; ${input.reminder24hCount} 24-hour and ${input.reminder2hCount} 2-hour reminder${input.reminder2hCount === 1 ? "" : "s"} prepared.`,
      href: "/automation",
      action: "Verify client reminders",
      complete:
        input.confirmationSentCount > 0 &&
        input.reminder24hCount > 0 &&
        input.reminder2hCount > 0,
    },
    {
      key: "activity-evidence",
      title: "Activity evidence recorded",
      description: `${recordedActivityTypes} of 3 core proof events recorded in the activity ledger.`,
      href: "/dashboard",
      action: "Review verified activity",
      complete:
        input.gmailActivityCount > 0 &&
        input.replyActivityCount > 0 &&
        input.bookingActivityCount > 0,
    },
  ];

  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    score: Math.round((completed / steps.length) * 100),
    steps,
  };
}
