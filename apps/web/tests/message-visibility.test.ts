import { describe, expect, it } from "vitest";
import {
  deleteMessageRaw,
  editMessageRaw,
  hideMessageRaw,
  isMessageDeleted,
  isMessageHidden,
  isMessageVisible,
  restoreMessageRaw,
} from "@/lib/conversations/message-visibility";

describe("conversation message visibility", () => {
  const now = "2026-08-21T00:00:00.000Z";

  it("hides and restores a message without losing source identifiers", () => {
    const hidden = hideMessageRaw(
      { external_message_id: "gmail-123" },
      { at: now, userId: "user-1" },
    );

    expect(isMessageHidden({ raw_json: hidden })).toBe(true);
    expect(isMessageVisible({ raw_json: hidden })).toBe(false);

    const restored = restoreMessageRaw(hidden);
    expect(isMessageVisible({ raw_json: restored })).toBe(true);
    expect(restored.external_message_id).toBe("gmail-123");
  });

  it("soft deletes a message so Gmail cannot re-import the same id", () => {
    const deleted = deleteMessageRaw(
      { external_message_id: "gmail-456" },
      { at: now, userId: "user-1" },
    );

    expect(isMessageDeleted({ raw_json: deleted })).toBe(true);
    expect(isMessageVisible({ raw_json: deleted })).toBe(false);
    expect(deleted.external_message_id).toBe("gmail-456");
  });

  it("preserves the first original text across multiple edits", () => {
    const first = editMessageRaw(
      {},
      {
        at: now,
        userId: "user-1",
        currentText: "Original",
      },
    );
    const second = editMessageRaw(first, {
      at: "2026-08-21T00:05:00.000Z",
      userId: "user-1",
      currentText: "First edit",
    });

    expect(second.original_text).toBe("Original");
    expect(second.edit_version).toBe(2);
    expect(second.edit_scope).toBe("clippy_copy_only");
  });
});
