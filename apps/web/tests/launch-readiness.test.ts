import { describe, expect, it } from "vitest";
import {
  buildLaunchReadiness,
  buildProductionProof,
} from "@/lib/launch-readiness";

const empty = {
  profileComplete: false,
  crmSelected: false,
  crmImportRequired: true,
  importComplete: false,
  knowledgeCount: 0,
  connectedChannels: 0,
  clientCount: 0,
  propertyCount: 0,
  approvedDraftCount: 0,
  calendarConnected: false,
  calendarHealthy: false,
  reminderCount: 0,
};

const emptyProof = {
  gmailConnected: false,
  gmailHealthy: false,
  calendarConnected: false,
  calendarHealthy: false,
  inboundEmailCount: 0,
  linkedGmailEnquiryCount: 0,
  approvedEmailDraftCount: 0,
  deliveredApprovedEmailCount: 0,
  confirmedBookingCount: 0,
  syncedCalendarBookingCount: 0,
  confirmationSentCount: 0,
  reminder24hCount: 0,
  reminder2hCount: 0,
  gmailActivityCount: 0,
  replyActivityCount: 0,
  bookingActivityCount: 0,
};

describe("pilot launch readiness", () => {
  it("requires verified outcomes rather than setup intentions", () => {
    const result = buildLaunchReadiness({
      ...empty,
      crmSelected: true,
      calendarConnected: true,
    });

    expect(result.score).toBe(0);
    expect(result.steps.find((step) => step.key === "crm")?.complete).toBe(false);
    expect(result.steps.find((step) => step.key === "calendar")?.complete).toBe(false);
  });

  it("reports a complete pilot workspace at 100 percent", () => {
    const result = buildLaunchReadiness({
      profileComplete: true,
      crmSelected: true,
      crmImportRequired: true,
      importComplete: true,
      knowledgeCount: 1,
      connectedChannels: 1,
      clientCount: 1,
      propertyCount: 1,
      approvedDraftCount: 1,
      calendarConnected: true,
      calendarHealthy: true,
      reminderCount: 1,
    });

    expect(result.completed).toBe(8);
    expect(result.score).toBe(100);
  });

  it("accepts Clippy as the CRM without requiring an external import", () => {
    const result = buildLaunchReadiness({
      ...empty,
      crmSelected: true,
      crmImportRequired: false,
    });

    const crm = result.steps.find((step) => step.key === "crm");
    expect(crm?.complete).toBe(true);
    expect(crm?.description).toContain("no external import is required");
  });

  it("does not accept configured reminders while Calendar sync is unhealthy", () => {
    const result = buildLaunchReadiness({
      ...empty,
      calendarConnected: true,
      reminderCount: 2,
    });

    expect(
      result.steps.find((step) => step.key === "calendar")?.complete,
    ).toBe(false);
  });
});

describe("production proof gate", () => {
  it("does not accept connected services without real outcome evidence", () => {
    const result = buildProductionProof({
      ...emptyProof,
      gmailConnected: true,
      gmailHealthy: true,
    });

    expect(result.score).toBe(0);
    expect(
      result.steps.find((step) => step.key === "gmail-intake")?.complete,
    ).toBe(false);
  });

  it("does not accept historical evidence while a production sync is unhealthy", () => {
    const result = buildProductionProof({
      ...emptyProof,
      gmailConnected: true,
      inboundEmailCount: 1,
      calendarConnected: true,
      confirmedBookingCount: 1,
      syncedCalendarBookingCount: 1,
    });

    expect(
      result.steps.find((step) => step.key === "gmail-intake")?.complete,
    ).toBe(false);
    expect(
      result.steps.find((step) => step.key === "booking-calendar")?.complete,
    ).toBe(false);
  });

  it("requires both approval and delivery evidence for a reply", () => {
    const approvalOnly = buildProductionProof({
      ...emptyProof,
      approvedEmailDraftCount: 1,
    });
    const deliveryOnly = buildProductionProof({
      ...emptyProof,
      deliveredApprovedEmailCount: 1,
    });

    expect(
      approvalOnly.steps.find((step) => step.key === "approved-delivery")
        ?.complete,
    ).toBe(false);
    expect(
      deliveryOnly.steps.find((step) => step.key === "approved-delivery")
        ?.complete,
    ).toBe(false);
  });

  it("reports a fully evidenced production flow at 100 percent", () => {
    const result = buildProductionProof({
      gmailConnected: true,
      gmailHealthy: true,
      calendarConnected: true,
      calendarHealthy: true,
      inboundEmailCount: 1,
      linkedGmailEnquiryCount: 1,
      approvedEmailDraftCount: 1,
      deliveredApprovedEmailCount: 1,
      confirmedBookingCount: 1,
      syncedCalendarBookingCount: 1,
      confirmationSentCount: 1,
      reminder24hCount: 1,
      reminder2hCount: 1,
      gmailActivityCount: 1,
      replyActivityCount: 1,
      bookingActivityCount: 1,
    });

    expect(result.completed).toBe(6);
    expect(result.score).toBe(100);
  });
});
