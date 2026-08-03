"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Database,
  Loader,
  Search,
  Sparkles,
} from "lucide-react";
import { CRM_OPTIONS, crmName } from "@/lib/crm-catalog";
import { buildOnboardingSummary } from "@/lib/onboarding";

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
  {
    id: "professional",
    label: "Professional",
    desc: "Trustworthy, established",
  },
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
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>({
    contacts: 0,
    listings: 0,
    inspections: 0,
    calendar_events: 0,
  });
  const [importProgress, setImportProgress] = useState<any[]>([
    { name: "Contacts & Leads", count: 0, done: false },
    { name: "Listings", count: 0, done: false },
    { name: "Inspections", count: 0, done: false },
    { name: "Calendar Events", count: 0, done: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [importError, setImportError] = useState("");
  const [crmSearch, setCrmSearch] = useState("");

  const [formData, setFormData] = useState({
    agencyName: "",
    agencyType: "",
    agencySize: "",
    location: "",
    primaryCrm: "",
    otherCrmName: "",
    brandPersonality: "",
  });

  const saveAgencySetup = async () => {
    setLoading(true);
    setSaveError("");
    try {
      const response = await fetch("/api/onboarding/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to save agency setup");
      }
      setPhase(3);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save agency setup",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError("");
    try {
      const response = await fetch("/api/import", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Business data could not be imported");
      }

      setImportResults(data.results);
      setImportProgress([
        {
          name: "Contacts & Leads",
          count: data.results.contacts,
          done: true,
        },
        { name: "Listings", count: data.results.listings, done: true },
        { name: "Inspections", count: data.results.inspections, done: true },
        {
          name: "Calendar Events",
          count: data.results.calendar_events,
          done: true,
        },
      ]);
      window.setTimeout(() => {
        setImporting(false);
        setPhase(5);
      }, 1500);
    } catch (error) {
      console.error("Import failed:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : "Business data could not be imported",
      );
      setImporting(false);
    }
  };

  const phases = [
    {
      title: "Welcome to Clippy",
      content: (
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Hi 👋 I&apos;m Clippy
            </h1>
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
              ⏱️ Estimated time:{" "}
              <span className="font-semibold text-foreground">
                Less than 10 minutes
              </span>
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
            <h2 className="text-xl font-bold text-foreground">
              Agency Profile
            </h2>
            <p className="text-sm text-muted-foreground">
              This helps me understand how you work
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Agency Name
              </label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={(e) =>
                  setFormData({ ...formData, agencyName: e.target.value })
                }
                placeholder="e.g. Coastal Realty"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Agency Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {agencyTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() =>
                      setFormData({ ...formData, agencyType: type.id })
                    }
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Agency Size
              </label>
              <select
                value={formData.agencySize}
                onChange={(e) =>
                  setFormData({ ...formData, agencySize: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select size</option>
                {agencySizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Office Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g. Melbourne, VIC"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Brand Personality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {brandPersonalities.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() =>
                      setFormData({ ...formData, brandPersonality: brand.id })
                    }
                    className={
                      "p-3 rounded-xl border-2 transition-all text-left " +
                      (formData.brandPersonality === brand.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50")
                    }
                  >
                    <div className="font-medium text-sm">{brand.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {brand.desc}
                    </div>
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
      title: "Choose your CRM",
      content: (
        <div className="mx-auto max-w-xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Database className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              What system runs your agency?
            </h2>
            <p className="text-sm text-muted-foreground">
              Your CRM remains the source of truth. Clippy will connect the
              client, property, enquiry and conversation history around it.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={crmSearch}
              onChange={(event) => setCrmSearch(event.target.value)}
              placeholder="Search your CRM"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {CRM_OPTIONS.filter((crm) =>
              `${crm.name} ${crm.category}`
                .toLowerCase()
                .includes(crmSearch.trim().toLowerCase()),
            ).map((crm) => {
              const selected = formData.primaryCrm === crm.id;
              return (
                <button
                  key={crm.id}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, primaryCrm: crm.id })
                  }
                  className={`group rounded-2xl border-2 p-4 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 min-w-10 items-center justify-center rounded-xl text-xs font-bold ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-primary"
                      }`}
                    >
                      {crm.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        {crm.name}
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-primary">
                        {crm.category}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {crm.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {formData.primaryCrm === "other" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                CRM or platform name
              </label>
              <input
                value={formData.otherCrmName}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    otherCrmName: event.target.value,
                  })
                }
                placeholder="Enter the system your agency uses"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">
              Selecting a CRM records your integration preference. Clippy will
              never overwrite CRM records without an approved write-back action.
            </p>
          </div>

          {saveError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {saveError}
            </p>
          )}

          <button
            onClick={saveAgencySetup}
            disabled={
              loading ||
              !formData.primaryCrm ||
              (formData.primaryCrm === "other" && !formData.otherCrmName.trim())
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving setup…
              </>
            ) : (
              <>
                Continue with{" "}
                {formData.primaryCrm
                  ? formData.primaryCrm === "other"
                    ? formData.otherCrmName || "my CRM"
                    : crmName(formData.primaryCrm)
                  : "CRM"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ),
    },
    {
      title: "Connect your tools",
      content: (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Plug & Play Integrations
            </h2>
            <p className="text-sm text-muted-foreground">
              One-click setup. No technical configuration.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {[
              {
                name: "Gmail",
                desc: "Read and send emails",
                icon: "📧",
                endpoint: "/api/integrations/google",
              },
              {
                name: "Google Calendar",
                desc: "Schedule inspections",
                icon: "📅",
                endpoint: "/api/integrations/google",
              },
              {
                name: "Facebook",
                desc: "Import leads from Messenger",
                icon: "📘",
                endpoint: "/api/integrations/facebook",
              },
              {
                name: "Instagram",
                desc: "Connect DMs",
                icon: "📸",
                endpoint: "/api/integrations/facebook",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.desc}
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = item.endpoint)}
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
            onClick={() => setPhase(4)}
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
            <h2 className="text-xl font-bold text-foreground">
              Import Existing Data
            </h2>
            <p className="text-sm text-muted-foreground">
              I&apos;ll learn from your current business
            </p>
          </div>

          {importing ? (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-medium">Importing your data...</span>
                </div>
                <div className="space-y-2">
                  {importProgress.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{item.name}</span>
                      <span
                        className={
                          item.done
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }
                      >
                        {item.done ? "✓ " + item.count : "Scanning..."}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  item: "Contacts & Leads",
                  count: importResults.contacts || "Auto-detect",
                },
                {
                  item: "Listings",
                  count: importResults.listings || "Auto-detect",
                },
                {
                  item: "Inspection History",
                  count: importResults.inspections || "Auto-detect",
                },
                { item: "Email Templates", count: "Auto-detect" },
                {
                  item: "Calendar Events",
                  count: importResults.calendar_events || "Auto-detect",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                >
                  <span className="font-medium text-sm">{item.item}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {importError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {importError}
            </p>
          )}

          {!importing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleImport}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start Import
                <Loader className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPhase(5)}
                className="h-12 rounded-xl border border-border bg-background font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Skip for now
              </button>
            </div>
          )}
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
            <h2 className="text-2xl font-bold text-foreground">
              Congratulations!
            </h2>
            <p className="text-muted-foreground">
              Your workspace setup is ready. These are the outcomes Clippy can
              verify:
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3 text-left">
            {buildOnboardingSummary({
              primaryCrmName:
                formData.primaryCrm === "other"
                  ? formData.otherCrmName
                  : crmName(formData.primaryCrm),
              importResults,
            }).map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left">
            <p className="text-sm text-blue-800">
              Clippy will show recommendations only after your workspace has
              verified conversations, opportunities, inspections or connected
              services.
            </p>
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
              style={{
                width: `${Math.round(((phase + 1) / phases.length) * 100)}%`,
              }}
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
