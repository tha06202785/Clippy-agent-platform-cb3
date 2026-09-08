import {
  executeComposioWhatsAppTool,
  getComposioConnectedAccount,
  getComposioUserId,
  verifyComposioConnectedAccount,
  type ComposioConnectedAccount,
} from "@/lib/composio";

type AdminClient = any;
export type WhatsAppSettings = Record<string, unknown>;
export type WhatsAppPhone = {
  id: string;
  display_phone_number: string;
  verified_name: string;
  verified: boolean;
};

export function getWhatsAppReadiness(settings: WhatsAppSettings) {
  const canSend =
    typeof settings.whatsapp_phone_number_id === "string" &&
    /^\d+$/.test(settings.whatsapp_phone_number_id) &&
    settings.whatsapp_sender_verified === true;
  const canReceive = Boolean(settings.whatsapp_inbound_verified_at);
  return {
    can_send: canSend,
    can_receive: canReceive,
    status: canSend && canReceive ? "healthy" : "warning",
    humanMessage: !canSend
      ? "WhatsApp is connected. Check the business phone number to finish sending setup."
      : !canReceive
        ? "WhatsApp replies are ready. Incoming enquiries still need a verified message connection."
        : "WhatsApp replies are ready and an incoming enquiry has been verified.",
  };
}

export function parseWhatsAppPhones(
  data: Record<string, unknown>,
): WhatsAppPhone[] {
  if (!Array.isArray(data.data)) {
    throw new Error("WhatsApp did not return a list of business phone numbers");
  }
  return data.data.flatMap((value: unknown) => {
    if (!value || typeof value !== "object") return [];
    const phone = value as Record<string, unknown>;
    if (typeof phone.id !== "string" || !/^\d+$/.test(phone.id)) return [];
    return [
      {
        id: phone.id,
        display_phone_number:
          typeof phone.display_phone_number === "string"
            ? phone.display_phone_number
            : phone.id,
        verified_name:
          typeof phone.verified_name === "string" ? phone.verified_name : "",
        verified:
          phone.code_verification_status === "VERIFIED" &&
          (!phone.status || phone.status === "CONNECTED"),
      },
    ];
  });
}

/** Never silently choose a different business number after a reconnect. */
export function chooseWhatsAppPhone(
  phones: WhatsAppPhone[],
  preferredId?: unknown,
) {
  if (typeof preferredId === "string" && preferredId) {
    return (
      phones.find((phone) => phone.id === preferredId && phone.verified) || null
    );
  }
  return phones.length === 1 && phones[0].verified ? phones[0] : null;
}

export async function verifyWhatsAppAccountForOrg({
  admin,
  orgId,
  accountId,
}: {
  admin: AdminClient;
  orgId: string;
  accountId: string;
}): Promise<ComposioConnectedAccount> {
  const account = await getComposioConnectedAccount(accountId);
  const { data: members, error } = await admin
    .from("user_org_roles")
    .select("user_id")
    .eq("org_id", orgId);
  if (error) throw new Error("Unable to verify WhatsApp account ownership");
  const owned = (members || []).some((member: { user_id: string }) =>
    verifyComposioConnectedAccount({
      account,
      toolkit: "whatsapp",
      expectedUserId: getComposioUserId(orgId, member.user_id),
    }),
  );
  if (!owned)
    throw new Error("Reconnect WhatsApp with an active member of this agency");
  return account;
}

/** Read-only provider check; only the verified sender metadata is saved locally. */
export async function checkComposioWhatsApp({
  admin,
  orgId,
  integration,
  selectedPhoneId,
}: {
  admin: AdminClient;
  orgId: string;
  integration: {
    id: string;
    connected_account_id?: unknown;
    metadata: WhatsAppSettings;
  };
  selectedPhoneId?: string;
}) {
  const settings = integration.metadata;
  const accountId =
    integration.connected_account_id || settings.connected_account_id;
  if (typeof accountId !== "string")
    throw new Error("WhatsApp account reference is missing");
  const account = await verifyWhatsAppAccountForOrg({
    admin,
    orgId,
    accountId,
  });
  const result = await executeComposioWhatsAppTool({
    tool: "WHATSAPP_GET_PHONE_NUMBERS",
    accountId,
    userId: account.user_id,
    arguments: { limit: 100 },
  });
  const phones = parseWhatsAppPhones(result);
  const phone = chooseWhatsAppPhone(
    phones,
    selectedPhoneId || settings.whatsapp_phone_number_id,
  );
  if (selectedPhoneId && !phone) {
    throw new Error(
      "Select a verified business phone number from this WhatsApp account",
    );
  }
  const nextSettings = {
    ...settings,
    access_mode: "approved_replies",
    write_enabled: Boolean(phone),
    // Retain an unavailable saved ID so a later check cannot silently choose
    // another number. Only explicit selection may replace it.
    whatsapp_phone_number_id:
      phone?.id || settings.whatsapp_phone_number_id || null,
    whatsapp_display_phone_number: phone?.display_phone_number || null,
    whatsapp_sender_verified: Boolean(phone),
    whatsapp_available_phones: phones,
    whatsapp_checked_at: new Date().toISOString(),
    whatsapp_inbound_verified_at:
      phone?.id === settings.whatsapp_phone_number_id
        ? settings.whatsapp_inbound_verified_at || null
        : null,
  };
  const { data: saved, error: saveError } = await admin
    .from("integrations")
    .update({
      settings_json: nextSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id)
    .eq("org_id", orgId)
    .eq("status", "connected")
    .contains("settings_json", { connected_account_id: accountId })
    .select("id")
    .maybeSingle();
  if (saveError || !saved)
    throw new Error(
      "WhatsApp changed during the check. Refresh and try again.",
    );
  const readiness = getWhatsAppReadiness(nextSettings);
  return {
    success: true,
    provider: "whatsapp",
    ...readiness,
    message: "WhatsApp Business connected through Composio",
    humanMessage: phone
      ? readiness.humanMessage
      : phones.length === 0
        ? "WhatsApp is connected, but this business account has no Cloud API phone number. Add a business phone number in Meta, then check again."
        : settings.whatsapp_phone_number_id &&
            !phones.some(
              (candidate) => candidate.id === settings.whatsapp_phone_number_id,
            )
          ? "The previously selected WhatsApp number is unavailable. Select the business number Clippy should use."
          : phones.length > 1
            ? "WhatsApp is connected. Select the verified business number Clippy should use."
            : "WhatsApp is connected, but the business phone number is not verified and registered for messaging yet. Complete the phone setup in Meta, then check again.",
    phones,
    selectedPhoneId: phone?.id || null,
    phoneNumber: phone?.display_phone_number || null,
  };
}

export async function sendComposioWhatsAppReply({
  admin,
  orgId,
  accountId,
  phoneNumberId,
  recipient,
  content,
}: {
  admin: AdminClient;
  orgId: string;
  accountId: string;
  phoneNumberId: string;
  recipient: string;
  content: string;
}) {
  const toNumber = recipient.trim().replace(/[\s()+.-]/g, "");
  if (!/^[1-9]\d{6,14}$/.test(toNumber)) {
    throw new Error(
      "Use a valid WhatsApp recipient number with its country code",
    );
  }
  if (!content.trim() || content.length > 4096) {
    throw new Error(
      "WhatsApp replies must contain between 1 and 4096 characters",
    );
  }
  if (!/^\d+$/.test(phoneNumberId)) {
    throw new Error(
      "Check the WhatsApp connection to select a verified business phone number",
    );
  }
  const account = await verifyWhatsAppAccountForOrg({
    admin,
    orgId,
    accountId,
  });
  // Recheck the sender belongs to this connection before every send. A stale
  // settings row or a provider reconnect must not redirect an agency's replies.
  const phoneResult = await executeComposioWhatsAppTool({
    tool: "WHATSAPP_GET_PHONE_NUMBERS",
    accountId,
    userId: account.user_id,
    arguments: { limit: 100 },
  });
  if (!chooseWhatsAppPhone(parseWhatsAppPhones(phoneResult), phoneNumberId)) {
    throw new Error(
      "This WhatsApp sender is no longer available. Check the connection before sending.",
    );
  }
  const result = await executeComposioWhatsAppTool({
    tool: "WHATSAPP_SEND_MESSAGE",
    accountId,
    userId: account.user_id,
    arguments: {
      phone_number_id: phoneNumberId,
      to_number: toNumber,
      text: content,
    },
  });
  const messages = result.messages;
  const id = Array.isArray(messages) ? messages[0]?.id : undefined;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(
      "WhatsApp did not confirm a message ID. Check delivery before trying again.",
    );
  }
  return { externalId: id, threadId: null };
}
