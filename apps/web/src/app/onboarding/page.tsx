"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building, Users, MapPin, Briefcase, Palette, Check, ArrowRight, Loader } from "lucide-react";

const agencyTypes = [
  { id: "residential_sales", label: "Residential Sales", icon: "🏠" },
  { id: "property_management", label: "Property Management", icon: "🔑" },
  { id: "commercial", label: "Commercial", icon: "🏢" },
  { id: "buyers_agent", label: "Buyers Agent", icon: "🤝" },
];

const agencySizes = [
  { id: "solo", label: "Solo Agent" },
  { id: "2-5", label: "2–5 Team Members" },
  { id: "6-20", label: "6–20 Staff" },
  { id: "20+", label: "20+ Agency" },
];

const brandPersonalities = [
  { id: "professional", label: "Professional", desc: "Trustworthy, established" },
  { id: "luxury", label: "Luxury", desc: "Premium, exclusive" },
  { id: "friendly", label: "Friendly", desc: "Warm, approachable" },
  { id: "premium", label: "Premium", desc: "High-end, sophisticated" },
  { id: "family", label: "Family", desc: "Community-focused" },
  { id: "corporate", label: "Corporate", desc: "Business-like, efficient" },
  { id: "minimal", label: "Minimal", desc: "Clean, modern" },
  { id: "modern", label: "Modern", desc: "Contemporary, fresh" },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    agencyName: "",
    agencyType: "",
    agencySize: "",
    location: "",
    primaryCrm: "",
    brandPersonality: "",
  });

  const phases = [
    {
      title: "Welcome to Clippy",
      content: (
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Hi 👋 I&apos;m Clippy</h1>
            <p className="text-lg text-muted-foreground">
              Think of me as your AI team member.
            </p>
            <p className="text-base text-muted-foreground">
              Over the next few minutes I&apos;ll:
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3 text-left">
            {[
              "Learn about your agency",
              "Connect your tools (Gmail, Calendar, Facebook)",
              "Import your listings and contacts",
              "Learn your writing style",
              "Be ready to help immediately",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              ⏱️ Estimated time: <span className="font-semibold text-foreground">Less than 10 minutes</span>
            </p>
          </div>

          <button
            onClick={() => setPhase(1)}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Let&apos;s Start
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      title: "Tell me about your agency",
      content: (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Agency Profile</h2>
            <p className="text-sm text-muted-foreground">This helps me understand how you work</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Agency Name</label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                placeholder="e.g. Coastal Realty"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Agency Type</label>
              <div className="grid grid-cols-2 gap-2">
                {agencyTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setFormData({ ...formData, agencyType: type.id })}
                    className={
                      "p-3 rounded-xl border-2 transition-all text-left " +
                      (formData.agencyType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50")
                    }
                  >
                    <span className="text-xl mb-1 block">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Agency Size</label>
              <select
                value={formData.agencySize}
                onChange={(e) => setFormData({ ...formData, agencySize: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select size</option>
                {agencySizes.map((size) => (
                  <option key={size.id} value={size.id}>{size.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Office Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Melbourne, VIC"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brand Personality</label>
              <div className="grid grid-cols-2 gap-2">
                {brandPersonalities.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => setFormData({ ...formData, brandPersonality: brand.id })}
                    className={
                      "p-3 rounded-xl border-2 transition-all text-left " +
                      (formData.brandPersonality === brand.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50")
                    }
                  >
                    <div className="font-medium text-sm">{brand.label}</div>
                    <div className="text-xs text-muted-foreground">{brand.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setPhase(2)}
            disabled={!formData.agencyName || !formData.agencyType}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      title: "Connect your tools",
      content: (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Plug & Play Integrations</h2>
            <p className="text-sm text-muted-foreground">One-click setup. No technical configuration.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {[
              { name: "Gmail", desc: "Read and send emails", icon: "📧", endpoint: "/api/integrations/google" },
              { name: "Google Calendar", desc: "Schedule inspections", icon: "📅", endpoint: "/api/integrations/google" },
              { name: "Facebook", desc: "Import leads from Messenger", icon: "📘", endpoint: "/api/integrations/facebook" },
              { name: "Instagram", desc: "Connect DMs", icon: "📸", endpoint: "/api/integrations/facebook" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <button
                  onClick={() => window.location.href = item.endpoint}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              🔒 All connections are secure. We never store your passwords.
            </p>
          </div>

          <button
            onClick={() => setPhase(3)}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      title: "Import your business",
      content: (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Import Existing Data</h2>
            <p className="text-sm text-muted-foreground">I&apos;ll learn from your current business</p>
          </div>

          <div className="space-y-3">
            {[
              { item: "Contacts & Leads", count: "Auto-detect" },
              { item: "Listings", count: "Auto-detect" },
              { item: "Inspection History", count: "Auto-detect" },
              { item: "Email Templates", count: "Auto-detect" },
              { item: "Calendar Events", count: "Auto-detect" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <span className="font-medium text-sm">{item.item}</span>
                <span className="text-xs text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPhase(4)}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Start Import
            <Loader className="w-4 h-4 animate-spin" />
          </button>
        </div>
      ),
    },
    {
      title: "You&apos;re all set!",
      content: (
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Check className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Congratulations!</h2>
            <p className="text-muted-foreground">
              I&apos;ve finished learning your agency. Here&apos;s what I know:
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3 text-left">
            {[
              "✓ 326 contacts imported",
              "✓ 41 listings indexed",
              "✓ 17 inspections scheduled",
              "✓ 4 staff profiles created",
              "✓ Brand tone learned",
              "✓ Gmail connected",
              "✓ Calendar connected",
              "✓ Facebook connected",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="text-sm text-amber-800 font-medium mb-2">I&apos;ve already identified:</p>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 14 leads needing follow-up</li>
              <li>• 3 inspections tomorrow</li>
              <li>• 2 expired listings</li>
              <li>• 6 overdue conversations</li>
            </ul>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Open My Dashboard
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Phase {phase + 1} of {phases.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(((phase + 1) / phases.length) * 100)}% complete
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round(((phase + 1) / phases.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* Phase Content */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {phases[phase].content}
        </div>
      </div>
    </div>
  );
}
