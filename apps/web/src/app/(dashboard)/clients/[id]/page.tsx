import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Enquiry = {
  id: string;
  source: string;
  status: string;
  first_enquired_at: string;
  last_activity_at: string;
  listings: {
    id: string;
    address: string;
    status: string | null;
    price: number | string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    property_type: string | null;
  } | null;
  conversations: Array<{
    id: string;
    channel: string;
    last_message_at: string | null;
  }>;
};

type Task = {
  id: string;
  title: string;
  type: string;
  status: string | null;
  due_at: string;
  listing_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string | null) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusStyle(status: string) {
  if (["offer", "won"].includes(status))
    return "bg-emerald-100 text-emerald-700";
  if (["qualified", "inspection_booked", "inspected"].includes(status))
    return "bg-blue-100 text-blue-700";
  if (["lost", "closed"].includes(status))
    return "bg-neutral-100 text-neutral-500";
  return "bg-amber-100 text-amber-700";
}

export default async function Client360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const [clientResult, enquiriesResult, tasksResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("org_id", membership.org_id)
      .maybeSingle(),
    supabase
      .from("property_enquiries")
      .select(
        "id,source,status,first_enquired_at,last_activity_at,listings(id,address,status,price,bedrooms,bathrooms,property_type),conversations(id,channel,last_message_at)",
      )
      .eq("lead_id", id)
      .eq("org_id", membership.org_id)
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id,title,type,status,due_at,listing_id")
      .eq("lead_id", id)
      .eq("org_id", membership.org_id)
      .order("due_at", { ascending: true })
      .limit(20),
  ]);

  if (clientResult.error) {
    console.error("Client 360 load failed", clientResult.error.code);
  }
  if (enquiriesResult.error) {
    console.error(
      "Client 360 property enquiries load failed",
      enquiriesResult.error.code,
    );
  }
  if (tasksResult.error) {
    console.error("Client 360 tasks load failed", tasksResult.error.code);
  }
  if (!clientResult.data) notFound();

  const client = clientResult.data;
  const enquiries = (enquiriesResult.data ?? []).map((enquiry) => ({
    ...enquiry,
    listings: Array.isArray(enquiry.listings)
      ? (enquiry.listings[0] ?? null)
      : enquiry.listings,
  })) as Enquiry[];
  const tasks = (tasksResult.data ?? []) as Task[];
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const conversationCount = enquiries.reduce(
    (total, enquiry) => total + (enquiry.conversations?.length || 0),
    0,
  );
  const overdueTasks = pendingTasks.filter(
    (task) => new Date(task.due_at).getTime() < Date.now(),
  );
  const nextAction =
    overdueTasks.length > 0
      ? `${overdueTasks.length} overdue follow-up${
          overdueTasks.length === 1 ? "" : "s"
        } need attention`
      : enquiries.length === 0
        ? "Link the client to their first property enquiry"
        : pendingTasks.length > 0
          ? pendingTasks[0].title
          : "Review the latest property enquiry";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-500 text-xl font-bold shadow-lg ring-4 ring-white/10">
              {initials(client.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">
                  {client.full_name || "Unnamed client"}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                    client.priority === "hot"
                      ? "bg-orange-400/20 text-orange-200"
                      : "bg-white/10 text-white/80"
                  }`}
                >
                  {client.priority || "normal"}
                </span>
              </div>
              <p className="mt-1 text-sm capitalize text-white/60">
                {client.buyer_type || "Client"} ·{" "}
                {client.stage?.replaceAll("_", " ") || "New enquiry"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {client.phone && (
              <>
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
                <a
                  href={`sms:${client.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </a>
              </>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
            <Link
              href={`/copilot?lead_id=${client.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300"
            >
              <Sparkles className="h-4 w-4" />
              Open Clippy
            </Link>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "Property interests",
              value: enquiries.length,
              icon: Building2,
            },
            {
              label: "Conversation threads",
              value: conversationCount,
              icon: MessageCircle,
            },
            {
              label: "Pending reminders",
              value: pendingTasks.length,
              icon: Bell,
            },
            {
              label: "AI score",
              value: client.ai_score ?? "—",
              icon: Target,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur sm:p-4"
            >
              <metric.icon className="h-4 w-4 text-emerald-300" />
              <div className="mt-2 text-2xl font-bold">{metric.value}</div>
              <div className="text-[11px] font-medium text-white/50">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Property journey
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Each card is a separate enquiry and conversation context.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {enquiries.length} linked
              </span>
            </div>

            {enquiries.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-neutral-300" />
                <h3 className="mt-3 font-semibold text-neutral-800">
                  No property enquiries linked yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                  New CRM and portal enquiries will appear here as separate
                  client–property relationships.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {enquiries.map((enquiry) => (
                  <article
                    key={enquiry.id}
                    className="group rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(enquiry.status)}`}
                      >
                        {enquiry.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h3 className="mt-4 font-bold text-neutral-900">
                      {enquiry.listings?.address || "Property not yet matched"}
                    </h3>
                    <p className="mt-1 text-xs capitalize text-neutral-500">
                      {enquiry.listings?.property_type || enquiry.source} ·{" "}
                      {enquiry.conversations?.length || 0} conversation
                      {(enquiry.conversations?.length || 0) === 1 ? "" : "s"}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      <span>Active {formatDate(enquiry.last_activity_at)}</span>
                      {enquiry.listings && (
                        <Link
                          href={`/property/${enquiry.listings.id}?client_id=${client.id}`}
                          className="inline-flex items-center gap-1 font-bold text-emerald-700"
                        >
                          Property 360
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-bold text-neutral-900">
              Follow-ups and reminders
            </h2>
            <div className="mt-4 space-y-3">
              {pendingTasks.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  No pending follow-ups for this client.
                </div>
              ) : (
                pendingTasks.slice(0, 6).map((task) => {
                  const overdue = new Date(task.due_at).getTime() < Date.now();
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 rounded-2xl border p-4 ${
                        overdue
                          ? "border-orange-200 bg-orange-50"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          overdue
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {overdue ? "Overdue · " : ""}
                          {formatDate(task.due_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-5 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700">
              Next best action
            </p>
            <h2 className="mt-1 text-lg font-bold text-neutral-900">
              {nextAction}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Use this as the next follow-up focus for{" "}
              {client.full_name || "this client"}. Visible Copilot context is
              the next dedicated milestone.
            </p>
            <Link
              href={`/copilot?lead_id=${client.id}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Open Clippy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
            <h2 className="font-bold text-neutral-900">Client details</h2>
            <div className="mt-4 space-y-4 text-sm">
              {[
                {
                  icon: UserRound,
                  label: "Type",
                  value: client.buyer_type || "Not recorded",
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: client.email || "Not recorded",
                },
                {
                  icon: Phone,
                  label: "Phone",
                  value: client.phone || "Not recorded",
                },
                {
                  icon: Calendar,
                  label: "Client since",
                  value: formatDate(client.created_at),
                },
                {
                  icon: DollarSign,
                  label: "Source",
                  value: client.source || "Manual",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 h-4 w-4 text-neutral-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-400">{item.label}</p>
                    <p className="truncate font-medium text-neutral-800">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Agent notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                  {client.notes}
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
