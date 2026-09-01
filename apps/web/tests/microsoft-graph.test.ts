import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMicrosoftMail } from "@/lib/integrations/microsoft-graph";

afterEach(() => vi.restoreAllMocks());

describe("Microsoft Graph mail delivery", () => {
  it("creates then sends a draft so the sent message has a stable external id", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "draft-1", conversationId: "thread-1" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));

    const result = await sendMicrosoftMail({
      accessToken: "secret-token",
      recipient: "lead@example.com",
      subject: "Re: 10 Smith Street",
      content: "Thanks for your enquiry.",
    });

    expect(result).toEqual({
      externalId: "draft-1",
      threadId: "thread-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages",
    );
    expect(fetchMock.mock.calls[1][0]).toContain("draft-1/send");
  });

  it("does not send when draft creation fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Denied" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      sendMicrosoftMail({
        accessToken: "secret-token",
        recipient: "lead@example.com",
        subject: "Subject",
        content: "Body",
      }),
    ).rejects.toThrow("Denied");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
