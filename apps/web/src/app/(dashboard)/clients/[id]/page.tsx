import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Target,
  UsersRound,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateFollowUpButton } from "@/components/create-follow-up-button";
import { FollowUpActions } from "@/components/follow-up-actions";

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

type RecentMessage = {
  id: string;
  conversation_id: string;
  direction_in_out: string;
  text: string | null;
  created_at: string;
  read_at: string | null;
};

type ClientConversation = {
  id: string;
  channel: string;
  last_message_at: string | null;
  listing_id: string | null;
};

type InspectionBooking = {
  id: string;
  booking_status: string;
  attendance_status: string;
  attendee_count: number | null;
  source_channel: string | null;
  calendar_sync_status: string | null;
  confirmation_sent_at: string | null;
  created_at: string;
  listings: { id: string; address: string } | null;
  inspection_time_slots: {
    starts_at: string;
    ends_at: string;
    inspection_type: string | null;
    address: string | null;
  } | null;
};

type ScheduledCommunication = {
  id: string;
  inspection_booking_id: string | null;
  type: string;
  channel: string | null;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  last_error: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
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

function communicationStyle(status: string) {
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "awaiting_approval") return "bg-amber-100 text-amber-700";
  if (["failed", "dead_letter"].includes(status))
    return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-neutral-100 text-neutral-500";
  return "bg-blue-100 text-blue-700";
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

  const [
    clientResult,
    enquiriesResult,
    conversationsResult,
    tasksResult,
    bookingsResult,
    communicationsResult,
  ] =
    await Promise.all([
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
        .from("conversations")
        .select("id,channel,last_message_at,listing_id")
        .eq("lead_id", id)
        .eq("org_id", membership.org_id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("id,title,type,status,due_at,listing_id")
        .eq("lead_id", id)
        .eq("org_id", membership.org_id)
        .order("due_at", { ascending: true })
        .limit(20),
      supabase
        .from("inspection_bookings")
        .select(
          "id,booking_status,attendance_status,attendee_count,source_channel,calendar_sync_status,confirmation_sent_at,created_at,listings(id,address),inspection_time_slots(starts_at,ends_at,inspection_type,address)",
        )
        .eq("lead_id", id)
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("scheduled_communications")
        .select(
          "id,inspection_booking_id,type,channel,scheduled_for,status,sent_at,last_error",
        )
        .eq("lead_id", id)
        .eq("org_id", membership.org_id)
        .order("scheduled_for", { ascending: false })
        .limit(50),
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
  if (conversationsResult.error) {
    console.error(
      "Client 360 conversations load failed",
      conversationsResult.error.code,
    );
  }
  if (bookingsResult.error) {
    console.error("Client 360 inspections load failed", bookingsResult.error.code);
  }
  if (communicationsResult.error) {
    console.error(
      "Client 360 communications load failed",
      communicationsResult.error.code,
    );
  }
  if (!clientResult.data) notFound();

  const client = clientResult.data;
  const enquiries = (enquiriesResult.data ?? []).map((enquiry) => ({
    ...enquiry,
    listings: Array.isArray(enquiry.listings)
      ? enquiry.listings[0] ?? null
      : enquiry.listings,
  })) as Enquiry[];
  const conversations = (conversationsResult.data ??
    []) as ClientConversation[];
  const tasks = (tasksResult.data ?? []) as Task[];
  const bookings = (bookingsResult.data ?? []).map((booking) => ({
    ...booking,
    listings: Array.isArray(booking.listings)
      ? booking.listings[0] ?? null
      : booking.listings,
    inspection_time_slots: Array.isArray(booking.inspection_time_slots)
      ? booking.inspection_time_slots[0] ?? null
      : booking.inspection_time_slots,
  })) as InspectionBooking[];
  const scheduledCommunications = (communicationsResult.data ??
    []) as ScheduledCommunication[];
  const communicationsByBooking = new Map<string, ScheduledCommunication[]>();
  for (const communication of scheduledCommunications) {
    if (!communication.inspection_booking_id) continue;
    communicationsByBooking.set(communication.inspection_booking_id, [
      ...(communicationsByBooking.get(communication.inspection_booking_id) || []),
      communication,
    ]);
  }
  const conversationContext = new Map<
    string,
    { channel: string; property: string }
  >();
  const propertyById = new Map(
    enquiries
      .filter((enquiry) => enquiry.listings)
      .map((enquiry) => [enquiry.listings!.id, enquiry.listings!.address]),
  );
  for (const conversation of conversations) {
    conversationContext.set(conversation.id, {
      channel: conversation.channel,
      property: conversation.listing_id
        ? propertyById.get(conversation.listing_id) || "Linked property"
        : "General enquiry",
    });
  }
  const conversationIds = [...conversationContext.keys()];
  const { data: messageData, error: messagesError } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("id,conversation_id,direction_in_out,text,created_at,read_at")
        .eq("org_id", membership.org_id)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };
  if (messagesError) {
    console.error("Client 360 activity load failed", messagesError.code);
  }
  const recentMessages = (messageData ?? []) as RecentMessage[];
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const conversationCount = conversations.length;
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
              label: "Inspections",
              value: bookings.length,
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Inspections and reminders
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Booking, agency calendar sync and client communication in one place.
                </p>
              </div>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
              >
                <Calendar className="h-3.5 w-3.5" /> Agency calendar
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed bg-neutral-50 p-6 text-center">
                <CalendarCheck2 className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-2 text-sm font-semibold text-neutral-700">
                  No inspections booked yet
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {bookings.map((booking) => {
                  const slot = booking.inspection_time_slots;
                  const communications =
                    communicationsByBooking.get(booking.id) || [];
                  const address =
                    booking.listings?.address || slot?.address || "Property";
                  return (
                    <article
                      key={booking.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-neutral-900">{address}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle(booking.booking_status)}`}
                            >
                              {booking.booking_status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-neutral-700">
                            {slot?.starts_at
                              ? formatDateTime(slot.starts_at)
                              : "Inspection time unavailable"}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            <span className="inline-flex items-center gap-1">
                              <UsersRound className="h-3.5 w-3.5" />
                              {booking.attendee_count || 1} attending
                            </span>
                            <span>·</span>
                            <span className="capitalize">
                              {booking.attendance_status.replaceAll("_", " ")}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                            booking.calendar_sync_status === "synced"
                              ? "bg-emerald-100 text-emerald-700"
                              : booking.calendar_sync_status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <CalendarCheck2 className="h-3 w-3" />
                          Calendar {booking.calendar_sync_status || "pending"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {communications.length === 0 ? (
                          <p className="text-xs text-neutral-500 sm:col-span-3">
                            No automated communications recorded.
                          </p>
                        ) : (
                          communications.map((communication) => (
                            <div
                              key={communication.id}
                              className="rounded-xl border bg-white p-3"
                            >
                              <p className="text-[11px] font-bold capitalize text-neutral-700">
                                {communication.type.replaceAll("_", " ")}
                              </p>
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${communicationStyle(communication.status)}`}
                              >
                                {communication.status.replaceAll("_", " ")}
                              </span>
                              <p className="mt-2 text-[10px] text-neutral-400">
                                {communication.sent_at
                                  ? `Sent ${formatDateTime(communication.sent_at)}`
                                  : `Due ${formatDateTime(communication.scheduled_for)}`}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

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
                    {enquiry.conversations?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enquiry.conversations
                          .slice(0, 3)
                          .map((conversation) => (
                            <Link
                              key={conversation.id}
                              href={`/copilot?lead_id=${client.id}&enquiry_id=${enquiry.id}&conversation_id=${conversation.id}${
                                enquiry.listings
                                  ? `&listing_id=${enquiry.listings.id}`
                                  : ""
                              }`}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold capitalize text-blue-700 transition hover:bg-blue-100"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {conversation.channel} thread
                            </Link>
                          ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      <span>Active {formatDate(enquiry.last_activity_at)}</span>
                      <Link
                        href={`/copilot?lead_id=${client.id}&enquiry_id=${enquiry.id}${
                          enquiry.listings
                            ? `&listing_id=${enquiry.listings.id}`
                            : ""
                        }`}
                        className="ml-auto inline-flex items-center gap-1 font-bold text-blue-700"
                      >
                        Ask Clippy
                        <Sparkles className="h-3.5 w-3.5" />
                      </Link>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Messages from every linked channel, kept in property context.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {recentMessages.length} messages
              </span>
            </div>

            {recentMessages.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <MessageCircle className="h-5 w-5 text-neutral-400" />
                No linked conversation messages yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentMessages.slice(0, 12).map((message) => {
                  const context = conversationContext.get(
                    message.conversation_id,
                  );
                  const inbound = message.direction_in_out === "in";
                  return (
                    <div
                      key={message.id}
                      className={`rounded-2xl border p-4 ${
                        inbound
                          ? "border-blue-200 bg-blue-50/70"
                          : "border-emerald-200 bg-emerald-50/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            inbound
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {inbound ? "Client" : "Agency"}
                        </span>
                        <span className="capitalize text-neutral-500">
                          {context?.channel || "conversation"}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="truncate text-neutral-500">
                          {context?.property || "General enquiry"}
                        </span>
                        <span className="ml-auto text-neutral-400">
                          {formatDateTime(message.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                        {message.text || "Message content unavailable"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-lg font-bold text-neutral-900">
                Follow-ups and reminders
              </h2>
              <CreateFollowUpButton
                leadId={client.id}
                defaultTitle={`Follow up with ${client.full_name || "client"}`}
              />
            </div>
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
                        <FollowUpActions
                          taskId={task.id}
                          copilotHref={`/copilot?lead_id=${client.id}`}
                        />
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
              {client.full_name || "this client"}. Clippy opens with this client
              visibly selected and verified.
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
