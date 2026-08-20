"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Forward,
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button, cn } from "@clippy/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConversationMessage = {
  id: string;
  direction_in_out: string;
  text: string | null;
  created_at: string;
  read_at: string | null;
  raw_json?: Record<string, unknown> | null;
};

type MessageAction = "edit" | "hide" | "unhide" | "delete";

function shortTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function deliveryLabel(message: ConversationMessage) {
  const status =
    typeof message.raw_json?.delivery_status === "string"
      ? message.raw_json.delivery_status
      : "";
  if (status === "read") return "Read";
  if (status === "delivered") return "Delivered";
  if (status === "failed") return "Failed";
  return status === "sent" ? "Sent" : "";
}

export function ConversationMessageCard({
  conversationId,
  conversationChannel,
  message,
  onChanged,
  onRemoved,
  onError,
  onNotice,
}: {
  conversationId: string;
  conversationChannel: string;
  message: ConversationMessage;
  onChanged: (message: ConversationMessage) => void;
  onRemoved: (messageId: string) => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [busyAction, setBusyAction] = useState<
    MessageAction | "forward" | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardRecipient, setForwardRecipient] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const raw = message.raw_json || {};
  const [forwardSubject, setForwardSubject] = useState(
    () =>
      String(raw.subject || "Forwarded message")
        .replace(/^\s*(?:re|fwd?):\s*/i, "")
        .trim() || "Forwarded message",
  );
  const outbound = message.direction_in_out === "out";
  const hidden = typeof raw.hidden_at === "string";
  const edited = typeof raw.edited_at === "string";

  const mutateMessage = async (action: MessageAction, text?: string) => {
    setBusyAction(action);
    onError("");
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/${message.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(text ? { text } : {}) }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "The message could not be updated");
      }
      if (action === "edit") {
        onChanged(data.message);
        setEditing(false);
        onNotice("Clippy copy updated. The original email is unchanged.");
      } else {
        onRemoved(message.id);
        onNotice(
          action === "hide"
            ? "Message hidden from Clippy and AI context."
            : action === "unhide"
              ? "Message restored to Conversations."
              : "Message deleted from Clippy. The Gmail original is unchanged.",
        );
      }
    } catch (cause) {
      onError(
        cause instanceof Error
          ? cause.message
          : "The message could not be updated",
      );
    } finally {
      setBusyAction(null);
      setDeleteOpen(false);
    }
  };

  const sendForward = async () => {
    setBusyAction("forward");
    onError("");
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/${message.id}/forward`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: forwardRecipient,
            subject: forwardSubject,
            note: forwardNote || undefined,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "The email could not be forwarded");
      }
      setForwardOpen(false);
      setForwardRecipient("");
      setForwardNote("");
      onNotice(`Email forwarded to ${forwardRecipient}.`);
    } catch (cause) {
      onError(
        cause instanceof Error
          ? cause.message
          : "The email could not be forwarded",
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <article className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div className="group max-w-[92%] sm:max-w-[85%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
            outbound
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card",
            hidden && "border-dashed opacity-75",
          )}
        >
          {hidden ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hidden from Clippy AI context
            </p>
          ) : null}
          {editing ? (
            <div className="space-y-2">
              <label htmlFor={`edit-message-${message.id}`} className="sr-only">
                Edit Clippy message copy
              </label>
              <textarea
                id={`edit-message-${message.id}`}
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={5}
                className="w-full min-w-[min(70vw,28rem)] resize-y rounded-lg border border-input bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <p
                className={cn(
                  "text-[10px]",
                  outbound
                    ? "text-primary-foreground/75"
                    : "text-muted-foreground",
                )}
              >
                This edits Clippy’s copy only. It never changes the original
                Gmail message or a message already sent.
              </p>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {message.text || "(No text content)"}
            </p>
          )}
          <p
            className={cn(
              "mt-1 text-[10px]",
              outbound ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {shortTime(message.created_at)}
            {outbound && deliveryLabel(message)
              ? ` · ${deliveryLabel(message)}`
              : ""}
            {edited ? " · Edited copy" : ""}
          </p>
        </div>

        <div
          className={cn(
            "mt-1 flex flex-wrap gap-1",
            outbound ? "justify-end" : "justify-start",
          )}
          aria-label="Message actions"
          role="group"
        >
          {editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(message.text || "");
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void mutateMessage("edit", editText.trim())}
                disabled={!editText.trim() || busyAction === "edit"}
              >
                {busyAction === "edit" ? (
                  <Loader2
                    className="h-3.5 w-3.5 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
              {conversationChannel === "email" && !hidden ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForwardOpen(true)}
                >
                  <Forward className="h-3.5 w-3.5" aria-hidden="true" />
                  Forward
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                disabled={busyAction === (hidden ? "unhide" : "hide")}
                onClick={() => void mutateMessage(hidden ? "unhide" : "hide")}
              >
                {hidden ? (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {hidden ? "Restore" : "Hide"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward email</DialogTitle>
            <DialogDescription>
              Review the recipient, subject and optional note. Clippy sends only
              after you press “Send forwarded email”.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`forward-recipient-${message.id}`}
                className="text-sm font-medium"
              >
                Recipient email
              </label>
              <input
                id={`forward-recipient-${message.id}`}
                type="email"
                autoComplete="email"
                value={forwardRecipient}
                onChange={(event) => setForwardRecipient(event.target.value)}
                placeholder="name@example.com"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`forward-subject-${message.id}`}
                className="text-sm font-medium"
              >
                Subject
              </label>
              <input
                id={`forward-subject-${message.id}`}
                value={forwardSubject}
                onChange={(event) => setForwardSubject(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Gmail will add “Fwd:” automatically.
              </p>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`forward-note-${message.id}`}
                className="text-sm font-medium"
              >
                Note (optional)
              </label>
              <textarea
                id={`forward-note-${message.id}`}
                value={forwardNote}
                onChange={(event) => setForwardNote(event.target.value)}
                rows={4}
                placeholder="Add a short note above the forwarded message…"
                className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={busyAction === "forward"}
              loadingText="Sending…"
              disabled={!forwardRecipient.trim() || !forwardSubject.trim()}
              onClick={() => void sendForward()}
            >
              <Forward className="h-4 w-4" aria-hidden="true" />
              Send forwarded email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete from Clippy?</DialogTitle>
            <DialogDescription>
              This removes the message from conversations and all future AI
              context. The original email stays in Gmail and will not be
              re-imported.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={busyAction === "delete"}
              loadingText="Deleting…"
              onClick={() => void mutateMessage("delete")}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete from Clippy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
