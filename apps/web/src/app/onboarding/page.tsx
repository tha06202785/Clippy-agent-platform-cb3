"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles, Phone, Mail, Calendar, Globe, Building2, Users, Shield } from "lucide-react";

type UserType = "individual" | "enterprise" | null;
type Step = "welcome" | "connect" | "preferences" | "team" | "compliance" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [progress, setProgress] = useState(0);

  const goTo = (s: Step) => { setStep(s); setProgress(prev => Math.min(prev + 25, 100)); };

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Clippy</h1>
          <p className="text-muted-foreground mt-2">Let us get you set up in under 2 minutes.</p>
          <div className="mt-8 space-y-3 text-left">
            {[
              { icon: Phone, text: "Connect your messaging" },
              { icon: Mail, text: "Link your email" },
              { icon: Calendar, text: "Sync your calendar" },
              { icon: Globe, text: "Connect your listings" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => goTo("connect")} className="mt-8 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            Get started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "connect") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Step 1 of 4</span>
            <span>·</span>
            <span>Connect your tools</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Connect your messaging</h1>
          <p className="text-sm text-muted-foreground mt-2">Link your communication channels so Clippy can draft and send on your behalf.</p>
          <div className="mt-6 space-y-3">
            {[
              { name: "WhatsApp", desc: "Send and receive messages", connected: false, color: "bg-emerald-500" },
              { name: "SMS", desc: "Text leads directly", connected: false, color: "bg-blue-500" },
              { name: "Gmail", desc: "Sync emails and draft replies", connected: false, color: "bg-red-500" },
              { name: "Google Calendar", desc: "Schedule tours and inspections", connected: false, color: "bg-blue-600" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + item.color}>
                    <span className="text-white font-bold text-sm">{item.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Connect</button>
              </div>
            ))}
          </div>
          <button onClick={() => goTo("preferences")} className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Continue
          </button>
          <button className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Skip for now</button>
        </div>
      </div>
    );
  }

  if (step === "preferences") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Step 2 of 4</span>
            <span>·</span>
            <span>Set your preferences</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">How should Clippy work for you?</h1>
          <p className="text-sm text-muted-foreground mt-2">Set your default preferences. You can change these anytime.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Autopilot level</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: "off", label: "Manual", desc: "I approve everything" },
                  { value: "supervised", label: "Review", desc: "Clippy drafts, I approve" },
                  { value: "full", label: "Autopilot", desc: "Clippy handles it" },
                ].map((opt) => (
                  <button key={opt.value} className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 text-left transition-colors">
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preferred communication channel</label>
              <select className="w-full mt-2 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option>WhatsApp</option>
                <option>SMS</option>
                <option>Email</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Working hours</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Start</span>
                  <select className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option>9:00 AM</option>
                    <option>8:00 AM</option>
                    <option>7:00 AM</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">End</span>
                  <select className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option>6:00 PM</option>
                    <option>7:00 PM</option>
                    <option>8:00 PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => goTo("done")} className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You are all set!</h1>
          <p className="text-muted-foreground mt-2">Clippy is ready to help you manage your leads, deals, and pipeline.</p>
          <div className="mt-8 p-4 rounded-xl bg-muted/50 text-left">
            <p className="text-sm font-medium text-foreground">What happens next:</p>
            <ul className="mt-3 space-y-2">
              {[
                "Clippy will analyze your existing leads and deals",
                "Tomorrow morning you will get your first briefing",
                "Start typing in the command bar or try the AI Copilot",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => router.push("/dashboard")} className="mt-8 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
