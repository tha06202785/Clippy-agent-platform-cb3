"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

const TARGETS = [
  ["ignore", "Do not import"],
  ["full_name", "Client name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["source", "Lead source"],
  ["buyer_type", "Buyer type"],
  ["notes", "Notes"],
] as const;
type Target = (typeof TARGETS)[number][0];
type Row = Record<string, string>;

const ALIASES: Record<Exclude<Target, "ignore">, string[]> = {
  full_name: ["full_name", "name", "contact_name", "client_name", "lead_name"],
  email: ["email", "email_address", "contact_email"],
  phone: ["phone", "mobile", "telephone", "phone_number", "contact_phone"],
  source: ["source", "lead_source", "channel", "origin"],
  buyer_type: ["buyer_type", "contact_type", "lead_type", "category"],
  notes: ["notes", "note", "comments", "description"],
};

function parseCsv(text: string) {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) records.push(row);
  const headers = records[0]?.map((header) => header.trim()) ?? [];
  return {
    headers,
    rows: records
      .slice(1, 501)
      .map((values) =>
        Object.fromEntries(
          headers.map((header, index) => [header, values[index] || ""]),
        ),
      ),
  };
}

function inferMapping(headers: string[]) {
  return Object.fromEntries(
    headers.map((header) => {
      const normalised = header
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
      const target = Object.entries(ALIASES).find(([, aliases]) =>
        aliases.includes(normalised),
      )?.[0];
      return [header, (target || "ignore") as Target];
    }),
  ) as Record<string, Target>;
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, Target>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    requiresReview: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapped = useMemo(
    () =>
      rows.map((row) => {
        const lead: Row = {};
        for (const header of headers) {
          const target = mapping[header];
          if (target && target !== "ignore") lead[target] = row[header] || "";
        }
        return lead;
      }),
    [headers, mapping, rows],
  );
  const valid = mapped.filter((lead) => lead.email || lead.phone);

  const loadFile = (file: File) => {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      if (!parsed.headers.length || !parsed.rows.length) {
        setError("The CSV needs a header row and at least one client row.");
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(inferMapping(parsed.headers));
    };
    reader.readAsText(file);
  };

  const importRows = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: valid }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Import failed");
      setResult({
        imported: payload.imported,
        skipped: payload.skipped,
        requiresReview: payload.requires_review || 0,
      });
      setHeaders([]);
      setRows([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-soft sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
          <FileSpreadsheet className="h-4 w-4" /> CRM field mapper
        </div>
        <h1 className="mt-4 text-3xl font-bold text-neutral-900">
          Import clients safely.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Upload a CSV, match your CRM columns to Clippy, review the preview and
          import without duplicating existing email addresses or phone numbers.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {result && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          Imported {result.imported} clients; skipped {result.skipped}{" "}
          duplicates or rows without an email/phone.
          {result.requiresReview > 0
            ? ` ${result.requiresReview} conflicting identities require manual review.`
            : ""}
        </div>
      )}

      {!headers.length ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-3xl border-2 border-dashed border-neutral-300 bg-white px-6 py-16 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30"
        >
          <Upload className="mx-auto h-10 w-10 text-emerald-600" />
          <span className="mt-3 block font-bold text-neutral-900">
            Choose CRM CSV file
          </span>
          <span className="mt-1 block text-sm text-neutral-500">
            Up to 500 clients per import
          </span>
        </button>
      ) : (
        <section className="space-y-5 rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-neutral-900">Map CRM fields</h2>
              <p className="text-xs text-neutral-500">
                {fileName} · {rows.length} rows
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHeaders([]);
                setRows([]);
              }}
              aria-label="Close import"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {headers.map((header) => (
              <label
                key={header}
                className="rounded-xl border bg-neutral-50 p-3 text-xs font-bold text-neutral-600"
              >
                {header}
                <select
                  value={mapping[header] || "ignore"}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [header]: event.target.value as Target,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-neutral-800"
                >
                  {TARGETS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th scope="col" className="p-3">
                    Name
                  </th>
                  <th scope="col" className="p-3">
                    Email
                  </th>
                  <th scope="col" className="p-3">
                    Phone
                  </th>
                  <th scope="col" className="p-3">
                    Source
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mapped.slice(0, 8).map((lead, index) => {
                  const ready = Boolean(lead.email || lead.phone);
                  return (
                    <tr key={index}>
                      <td className="p-3">{lead.full_name || "—"}</td>
                      <td className="p-3">{lead.email || "—"}</td>
                      <td className="p-3">{lead.phone || "—"}</td>
                      <td className="p-3">{lead.source || "crm_import"}</td>
                      <td className="p-3">
                        {ready ? (
                          <span className="text-emerald-700">Ready</span>
                        ) : (
                          <span className="text-red-700">
                            Email or phone required
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <AlertCircle className="h-4 w-4" /> {valid.length} of{" "}
              {rows.length} rows ready
            </p>
            <button
              type="button"
              disabled={busy || valid.length === 0}
              onClick={() => void importRows()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}{" "}
              Import {valid.length} clients
            </button>
          </div>
        </section>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
