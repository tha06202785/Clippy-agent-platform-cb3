"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, ArrowRight, Mail, Database, Sparkles } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "importing" | "done">("choose");

  if (step === "choose") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bring your data to Clippy</h1>
          <p className="text-muted-foreground mt-1">We will import your leads, listings, and deals. Your old data stays where it is.</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => setStep("importing")}
            className="flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left w-full group">
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
              <Database className="w-7 h-7 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">Import from Follow Up Boss</p>
              <p className="text-sm text-muted-foreground mt-0.5">Most agents use this. One click to connect.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
          </button>
          <button onClick={() => setStep("importing")}
            className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all text-left w-full group">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
              <Mail className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">Email us your data</p>
              <p className="text-sm text-muted-foreground mt-0.5">Export from your current CRM and email it to import@clippy.ai. We do the rest.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
          </button>
          <button onClick={() => setStep("importing")}
            className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all text-left w-full group">
            <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
              <Upload className="w-7 h-7 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">Upload a file</p>
              <p className="text-sm text-muted-foreground mt-0.5">CSV, Excel, or any file from your CRM. We figure out the columns.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Your data is safe. We never delete anything from your current system.
        </p>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Importing your data...</h1>
        <p className="text-muted-foreground">This usually takes 2-5 minutes. We will send you an email when it is done.</p>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: "60%" }} />
        </div>
        <button onClick={() => setStep("done")}
          className="text-sm text-muted-foreground hover:text-foreground underline">
          Click here if the import is taking too long
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Import complete!</h1>
        <p className="text-muted-foreground">Your leads, listings, and deals are now in Clippy. Your Morning Briefing tomorrow will include everything.</p>
        <button onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Go to dashboard
        </button>
      </div>
    );
  }

  return null;
}
