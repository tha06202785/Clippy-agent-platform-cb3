"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronRight, Building2, User, MapPin, Phone,
  Mail, Upload, Link2, Star, ArrowRight, Shield
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Agency Profile", icon: Building2, desc: "Set up your agency name and details" },
  { id: 2, title: "Your Profile", icon: User, desc: "Tell us about yourself" },
  { id: 3, title: "First Listing", icon: MapPin, desc: "Add a property to get started" },
  { id: 4, title: "Connect Leads", icon: Link2, desc: "Import leads or connect an integration" },
  { id: 5, title: "You're Ready", icon: Star, desc: "Clippy is set up and ready to go" },
];

interface OnboardingData {
  agencyName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  listingAddress: string;
  listingPrice: string;
  listingBedrooms: string;
  listingBathrooms: string;
  leadSource: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    agencyName: "",
    agentName: "",
    agentEmail: "",
    agentPhone: "",
    listingAddress: "",
    listingPrice: "",
    listingBedrooms: "",
    listingBathrooms: "",
    leadSource: "",
  });

  const update = (key: keyof OnboardingData, value: string) =>
    setData(prev => ({ ...prev, [key]: value }));

  const next = () => setStep(s => Math.min(s + 1, 5));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // Create listing
      if (data.listingAddress) {
        await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: data.listingAddress,
            price: data.listingPrice,
            bedrooms: parseInt(data.listingBedrooms) || undefined,
            bathrooms: parseInt(data.listingBathrooms) || undefined,
            status: "active",
          }),
        });
      }

      // Create lead if source provided
      if (data.leadSource) {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: data.agentName || "Sample Lead",
            source: data.leadSource,
            status: "new",
            stage: "inquiry",
            notes: "Added during onboarding",
          }),
        });
      }

      router.push("/dashboard");
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar */}
      <div className="w-80 bg-card border-r border-border p-8 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">C</div>
          <span className="font-bold text-foreground">Clippy</span>
        </div>

        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Setup progress</p>

        <div className="flex-1 space-y-1">
          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <div className={
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all " +
                  (done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                }>
                  {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <div>
                  <p className={"text-sm font-medium " + (active || done ? "text-foreground" : "text-muted-foreground")}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Takes about <span className="text-foreground font-medium">3 minutes</span> to complete.
            You can always edit these later.
          </p>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Name your agency</h1>
                <p className="text-muted-foreground mt-1">This appears on all outgoing communications.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Agency name</label>
                <input
                  type="text"
                  value={data.agencyName}
                  onChange={e => update("agencyName", e.target.value)}
                  placeholder="e.g. Coastal Realty, Riverstone Properties"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <button onClick={next} disabled={!data.agencyName.trim()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">About you</h1>
                <p className="text-muted-foreground mt-1">Help your leads get to know the agent behind the replies.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Your full name</label>
                  <input type="text" value={data.agentName} onChange={e => update("agentName", e.target.value)}
                    placeholder="e.g. Sarah Mitchell"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input type="email" value={data.agentEmail} onChange={e => update("agentEmail", e.target.value)}
                    placeholder="sarah@coastalrealty.com.au"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Mobile</label>
                  <input type="tel" value={data.agentPhone} onChange={e => update("agentPhone", e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={back}
                  className="px-6 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Back
                </button>
                <button onClick={next} disabled={!data.agentName.trim()}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Add your first listing</h1>
                <p className="text-muted-foreground mt-1">Import a property so Clippy knows what you're selling.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Property address *</label>
                  <input type="text" value={data.listingAddress} onChange={e => update("listingAddress", e.target.value)}
                    placeholder="e.g. 42 Marine Parade, Brighton VIC 3186"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Asking price</label>
                    <input type="text" value={data.listingPrice} onChange={e => update("listingPrice", e.target.value)}
                      placeholder="e.g. $1,250,000"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Beds</label>
                      <input type="number" value={data.listingBedrooms} onChange={e => update("listingBedrooms", e.target.value)}
                        placeholder="3"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Baths</label>
                      <input type="number" value={data.listingBathrooms} onChange={e => update("listingBathrooms", e.target.value)}
                        placeholder="2"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={back}
                  className="px-6 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Back
                </button>
                <button onClick={next}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  {data.listingAddress.trim() ? "Add listing & continue" : "Skip for now"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Where do your leads come from?</h1>
                <p className="text-muted-foreground mt-1">Connect one to start importing automatically.</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: "facebook", label: "Facebook & Instagram", desc: "Import leads from your Facebook page", color: "bg-blue-600" },
                  { id: "website", label: "Website form", desc: "Connect your website's contact form", color: "bg-emerald-600" },
                  { id: "manual", label: "I'll add them manually", desc: "Import from a spreadsheet or add one-by-one", color: "bg-purple-600" },
                ].map((opt) => (
                  <label key={opt.id}
                    className={"flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all " +
                      (data.leadSource === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <input type="radio" name="source" value={opt.id}
                      checked={data.leadSource === opt.id}
                      onChange={() => update("leadSource", opt.id)}
                      className="sr-only" />
                    <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 " + opt.color}>
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {data.leadSource === opt.id && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={back}
                  className="px-6 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Back
                </button>
                <button onClick={next}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-5">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  Clippy is configured and ready to help you manage leads, draft replies, and close deals.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-left">
                {[
                  { icon: Mail, title: "AI Draft Replies", desc: "Draft replies with one click" },
                  { icon: Check, title: "AU Compliance", desc: "Every reply is compliant" },
                  { icon: Star, title: "24/7 Coverage", desc: "Your pipeline never sleeps" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-border bg-card p-4">
                    <Icon className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-800">
                  <span className="font-semibold">14-day free trial.</span> No credit card required.
                  Cancel anytime.
                </p>
              </div>

              <button onClick={handleFinish} disabled={submitting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Setting up…</>
                ) : (
                  <>Go to your dashboard <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
