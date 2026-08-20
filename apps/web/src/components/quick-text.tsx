"use client";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button, Textarea, cn } from "@clippy/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const templates = [
  "Hi {name}, just following up on our conversation about {property}. Let me know if you have any questions!",
  "Great news! I have a new property that matches what you are looking for at {property}. Available this weekend?",
  "Hi {name}, confirming our appointment at {property} on {date} at {time}. See you then!",
  "Thanks for your interest in {property}. I have sent through the details. Let me know your thoughts!",
];

const suggestionLabels = [
  "Follow up",
  "Share property",
  "Confirm appointment",
  "Send details",
];

interface QuickTextProps {
  onClose: () => void;
  contactName?: string;
  contactPhone?: string;
}

export function QuickText({
  onClose,
  contactName,
  contactPhone,
}: QuickTextProps) {
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const handleTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    setMessage(
      templates[idx]
        .replace(/{name}/g, contactName || "there")
        .replace(/{property}/g, "your dream home")
        .replace(/{date}/g, "tomorrow")
        .replace(/{time}/g, "2pm"),
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle>Quick text</DialogTitle>
          <DialogDescription>
            Choose a starting point, then review the message before selecting a
            channel.
          </DialogDescription>
        </DialogHeader>
        {contactName && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {contactName
                .split(" ")
                .map((name) => name[0])
                .join("")}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {contactName}
              </p>
              <p className="text-xs text-muted-foreground">{contactPhone}</p>
            </div>
          </div>
        )}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              AI suggestions
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestionLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => handleTemplate(index)}
                aria-pressed={selectedTemplate === index}
                className={cn(
                  "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedTemplate === index && "bg-primary/10 text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="sr-only" htmlFor="quick-text-message">
          Message
        </label>
        <Textarea
          id="quick-text-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type your message…"
          rows={4}
        />
        <div className="mt-4 flex items-center gap-2">
          <Button className="min-h-12 flex-1" disabled={!message.trim()}>
            <Send className="h-4 w-4" aria-hidden="true" /> Send via WhatsApp
          </Button>
          <Button className="min-h-12" variant="outline">
            SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
