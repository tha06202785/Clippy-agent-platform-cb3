"use client";

import { useState, useRef } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Download, ArrowRight, X, User, Mail, Phone, Home
} from "lucide-react";

const CSV_TEMPLATE = "full_name,email,phone,source,buyer_type,notes\nSarah Mitchell,sarah@email.com,+61 400 000 000,Facebook,upgrader,Looking to upgrade from unit\nJames Chen,james@email.com,+61 412 345 678,Website,first_buyer,First home buyer, registered interest\n";

const SAMPLE_LEADS = [
  { full_name: "Sarah Mitchell", email: "sarah@email.com", phone: "+61 400 000 000", source: "Facebook", buyer_type: "upgrader", notes: "Looking to upgrade" },
  { full_name: "James Chen", email: "james@email.com", phone: "+61 412 345 678", source: "Website", buyer_type: "first_buyer", notes: "First home buyer" },
];

interface ParsedLead {
  full_name: string;
  email: string;
  phone: string;
  source: string;
  buyer_type: string;
  notes: string;
  valid: boolean;
  errors: string[];
}

function validateLead(row: Record<string, string>): { lead: ParsedLead; errors: string[] } {
  const errors: string[] = [];
  if (!row.full_name && !row.email && !row.phone) {
    errors.push("Row has no name, email or phone — skipped");
  }
  if (row.email && !row.email.includes("@")) {
    errors.push("Invalid email");
  }
  return {
    lead: {
      full_name: row.full_name || "",
      email: row.email || "",
      phone: row.phone || "",
      source: row.source || "manual",
      buyer_type: row.buyer_type || "",
      notes: row.notes || "",
      valid: errors.length === 0,
      errors,
    },
    errors,
  };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<ParsedLead[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const validated = rows.map(row => {
        const { lead, errors } = validateLead(row);
        return lead;
      });
      setPreview(validated);
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setResults(null);

    const validLeads = preview.filter(l => l.valid);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const lead of validLeads) {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
        });
        if (res.ok) success++;
        else {
          failed++;
          const data = await res.json();
          errors.push(`${lead.full_name}: ${data.error}`);
        }
      } catch {
        failed++;
        errors.push(`${lead.full_name}: Network error`);
      }
    }

    setResults({ success, failed, errors: errors.slice(0, 10) });
    setImporting(false);
    setPreview(null);
  };

  const handleSampleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const lead of SAMPLE_LEADS) {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setResults({ success, failed, errors: [] });
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import leads</h1>
        <p className="text-muted-foreground mt-1">Upload a CSV or add leads one-by-one</p>
      </div>

      {/* Download template */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">CSV template</p>
            <p className="text-xs text-muted-foreground">Required columns: full_name, email, phone, source</p>
          </div>
        </div>
        <button
          onClick={() => {
            const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "clippy_leads_template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={
            "rounded-xl border-2 border-dashed p-16 text-center cursor-pointer transition-all " +
            (dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30")
          }
        >
          <Upload className={"w-12 h-12 mx-auto mb-4 " + (dragOver ? "text-primary" : "text-muted-foreground/50")} />
          <p className="text-foreground font-medium mb-1">Drop your CSV here</p>
          <p className="text-sm text-muted-foreground">or click to browse files</p>
          <p className="text-xs text-muted-foreground mt-2">Supports .csv files</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{preview.length} leads found</p>
              <p className="text-xs text-muted-foreground">
                {preview.filter(l => l.valid).length} valid · {preview.filter(l => !l.valid).length} with issues
              </p>
            </div>
            <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Email", "Phone", "Source", "Type", "Status"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((lead, i) => (
                  <tr key={i} className={"border-b border-border last:border-0 " + (!lead.valid ? "bg-red-50/50" : "")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {lead.valid
                          ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-medium text-foreground">{lead.full_name || "—"}</p>
                          {lead.errors.map(e => <p key={e} className="text-[10px] text-red-500">{e}</p>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{lead.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{lead.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{lead.source || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{lead.buyer_type || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                        (lead.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {lead.valid ? "Ready" : "Invalid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border flex gap-3">
            <button onClick={() => setPreview(null)}
              className="px-5 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleImport} disabled={importing || preview.filter(l => l.valid).length === 0}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {importing ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Importing…</>
              ) : (
                <><Upload className="w-4 h-4" /> Import {preview.filter(l => l.valid).length} leads</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className={"rounded-xl border p-5 " + (results.failed === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
          <div className="flex items-center gap-3 mb-3">
            {results.failed === 0
              ? <CheckCircle className="w-6 h-6 text-emerald-600" />
              : <AlertCircle className="w-6 h-6 text-amber-600" />
            }
            <div>
              <p className={"font-semibold " + (results.failed === 0 ? "text-emerald-800" : "text-amber-800")}>
                {results.success} lead{results.success !== 1 ? "s" : ""} imported successfully
                {results.failed > 0 && `, ${results.failed} failed`}
              </p>
            </div>
          </div>
          {results.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {results.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick sample import */}
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">No file handy? Try the sample data.</p>
        <button onClick={handleSampleImport} disabled={importing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50">
          <User className="w-4 h-4" />
          Import 2 sample leads
        </button>
      </div>
    </div>
  );
}
