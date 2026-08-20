export type MessageRaw = Record<string, unknown>;

export type StoredMessageLike = {
  raw_json?: unknown;
};

export function messageRaw(value: unknown): MessageRaw {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as MessageRaw) }
    : {};
}

export function isMessageDeleted(message: StoredMessageLike): boolean {
  const raw = messageRaw(message.raw_json);
  return typeof raw.deleted_at === "string" && raw.deleted_at.length > 0;
}

export function isMessageHidden(message: StoredMessageLike): boolean {
  const raw = messageRaw(message.raw_json);
  return (
    !isMessageDeleted(message) &&
    typeof raw.hidden_at === "string" &&
    raw.hidden_at.length > 0
  );
}

export function isMessageVisible(message: StoredMessageLike): boolean {
  return !isMessageDeleted(message) && !isMessageHidden(message);
}

export function hideMessageRaw(
  value: unknown,
  input: { at: string; userId?: string | null; reason?: string },
): MessageRaw {
  const raw = messageRaw(value);
  return {
    ...raw,
    hidden_at: input.at,
    hidden_by_user_id: input.userId || null,
    hidden_reason: input.reason || "user_hidden",
  };
}

export function restoreMessageRaw(value: unknown): MessageRaw {
  const raw = messageRaw(value);
  delete raw.hidden_at;
  delete raw.hidden_by_user_id;
  delete raw.hidden_reason;
  return raw;
}

export function deleteMessageRaw(
  value: unknown,
  input: { at: string; userId: string },
): MessageRaw {
  return {
    ...hideMessageRaw(value, {
      at: input.at,
      userId: input.userId,
      reason: "user_deleted",
    }),
    deleted_at: input.at,
    deleted_by_user_id: input.userId,
  };
}

export function editMessageRaw(
  value: unknown,
  input: {
    at: string;
    userId: string;
    currentText: string;
  },
): MessageRaw {
  const raw = messageRaw(value);
  return {
    ...raw,
    original_text:
      typeof raw.original_text === "string"
        ? raw.original_text
        : input.currentText,
    edited_at: input.at,
    edited_by_user_id: input.userId,
    edit_version:
      typeof raw.edit_version === "number" ? raw.edit_version + 1 : 1,
    edit_scope: "clippy_copy_only",
  };
}
