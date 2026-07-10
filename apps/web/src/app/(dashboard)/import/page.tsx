import Link from "next/link";
import { Upload, Mail, Database, ArrowRight } from "lucide-react";

export default function ImportPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bring your data to Clippy</h1>
        <p className="text-muted-foreground mt-1">We will import your leads, listings, and deals. Your old data stays where it is.</p>
      </div>
      <div className="space-y-3">
        <Link href="/dashboard"
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left w-full group">
          <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
            <Database className="w-7 h-7 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-foreground">Import from Follow Up Boss</p>
            <p className="text-sm text-muted-foreground mt-0.5">Most agents use this. One click to connect.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
        </Link>
        <Link href="/dashboard"
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all text-left w-full group">
          <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
            <Mail className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-foreground">Email us your data</p>
            <p className="text-sm text-muted-foreground mt-0.5">Export from your current CRM and email it to import@clippy.ai. We do the rest.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
        </Link>
        <Link href="/dashboard"
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all text-left w-full group">
          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
            <Upload className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-foreground">Upload a file</p>
            <p className="text-sm text-muted-foreground mt-0.5">CSV, Excel, or any file from your CRM. We figure out the columns.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
