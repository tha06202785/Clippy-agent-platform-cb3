import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  DollarSign,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateFollowUpButton } from "@/components/create-follow-up-button";
import { FollowUpActions } from "@/components/follow-up-actions";

export const dynamic = "force-dynamic";

type Client = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  priority: string | null;
  stage: string | null;
  ai_score: number | null;
};

type Enquiry = {
  id: string;
  source: string;
  status: string;
  first_enquired_at: string;
  last_activity_at: string;
  leads: Client | null;
  conversations: Array<{
    id: string;
    channel: string;
    last_message_at: string | null;
  }>;
};

type InspectionBooking = {
  id: string;
  booking_status: string;
  attendance_status: string;
  attendee_count: number;
  leads: Pick<Client, "id" | "full_name"> | null;
  inspection_time_slots: {
    starts_at: string;
    ends_at: string;
    inspection_type: string;
  } | null;
};

type Task = {
  id: string;
  title: string;
  type: string;
  status: string | null;
  due_at: string;
  lead_id: string | null;
};

type PropertyConversation = {
  id: string;
  lead_id: string;
  channel: string;
  last_message_at: string | null;
};

type RecentMessage = {
  id: string;
  conversation_id: string;
  direction_in_out: string;
  text: string | null;
  created_at: string;
  read_at: string | null;
};

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

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

function formatPrice(value: number | string | null) {
  if (value === null || value === "") return "Price on request";
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function initials(name: string | null) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function enquiryStatusStyle(status: string) {
  if (["offer", "won"].includes(status))
    return "bg-emerald-100 text-emerald-700";
  if (["qualified", "inspection_booked", "inspected"].includes(status))
    return "bg-blue-100 text-blue-700";
  if (["lost", "closed"].includes(status))
    return "bg-neutral-100 text-neutral-500";
  return "bg-amber-100 text-amber-700";
}

export default async function Property360Page({
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
    listingResult,
    enquiriesResult,
    bookingsResult,
    conversationsResult,
    tasksResult,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id,address,price,bedrooms,bathrooms,property_type,status,stage,description,features,images,created_at",
      )
      .eq("id", id)
      .eq("org_id", membership.org_id)
      .maybeSingle(),
    supabase
      .from("property_enquiries")
      .select(
        "id,source,status,first_enquired_at,last_activity_at,leads(id,full_name,email,phone,priority,stage,ai_score),conversations(id,channel,last_message_at)",
      )
      .eq("listing_id", id)
      .eq("org_id", membership.org_id)
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("inspection_bookings")
      .select(
        "id,booking_status,attendance_status,attendee_count,leads(id,full_name),inspection_time_slots(starts_at,ends_at,inspection_type)",
      )
      .eq("listing_id", id)
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("conversations")
      .select("id,lead_id,channel,last_message_at")
      .eq("listing_id", id)
      .eq("org_id", membership.org_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from("tasks")
      .select("id,title,type,status,due_at,lead_id")
      .eq("listing_id", id)
      .eq("org_id", membership.org_id)
      .order("due_at", { ascending: true })
      .limit(30),
  ]);

  if (listingResult.error) {
    console.error("Property 360 listing load failed", listingResult.error.code);
  }
  if (enquiriesResult.error) {
    console.error(
      "Property 360 enquiry load failed",
      enquiriesResult.error.code,
    );
  }
  if (bookingsResult.error) {
    console.error(
      "Property 360 inspection load failed",
      bookingsResult.error.code,
    );
  }
  if (tasksResult.error) {
    console.error("Property 360 task load failed", tasksResult.error.code);
  }
  if (conversationsResult.error) {
    console.error(
      "Property 360 conversations load failed",
      conversationsResult.error.code,
    );
  }
  if (!listingResult.data) notFound();

  const listing = listingResult.data;
  const features = Array.isArray(listing.features)
    ? listing.features.filter(
        (feature: unknown): feature is string => typeof feature === "string",
      )
    : [];
  const images = Array.isArray(listing.images)
    ? listing.images.filter(
        (image: unknown): image is string => typeof image === "string",
      )
    : [];
  const enquiries = (enquiriesResult.data ?? []).map((enquiry) => ({
    ...enquiry,
    leads: firstRelated(enquiry.leads),
  })) as Enquiry[];
  const bookings = (bookingsResult.data ?? []).map((booking) => ({
    ...booking,
    leads: firstRelated(booking.leads),
    inspection_time_slots: firstRelated(booking.inspection_time_slots),
  })) as InspectionBooking[];
  const conversations = (conversationsResult.data ??
    []) as PropertyConversation[];
  const tasks = (tasksResult.data ?? []) as Task[];
  const clientById = new Map(
    enquiries
      .filter((enquiry) => enquiry.leads)
      .map((enquiry) => [
        enquiry.leads!.id,
        enquiry.leads!.full_name || "Unnamed client",
      ]),
  );
  const conversationContext = new Map(
    conversations.map((conversation) => [
      conversation.id,
      {
        channel: conversation.channel,
        client: clientById.get(conversation.lead_id) || "Client",
        leadId: conversation.lead_id,
      },
    ]),
  );
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
    console.error("Property 360 activity load failed", messagesError.code);
  }
  const recentMessages = (messageData ?? []) as RecentMessage[];
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const now = Date.now();
  const upcomingBookings = bookings
    .filter(
      (booking) =>
        booking.booking_status !== "cancelled" &&
        booking.inspection_time_slots &&
        new Date(booking.inspection_time_slots.starts_at).getTime() >= now,
    )
    .sort(
      (left, right) =>
        new Date(left.inspection_time_slots!.starts_at).getTime() -
        new Date(right.inspection_time_slots!.starts_at).getTime(),
    );
  const conversationCount = conversations.length;
  const offerCount = enquiries.filter((enquiry) =>
    ["offer", "won"].includes(enquiry.status),
  ).length;
  const hotBuyerCount = enquiries.filter(
    (enquiry) => enquiry.leads?.priority === "hot",
  ).length;
  const overdueTasks = pendingTasks.filter(
    (task) => new Date(task.due_at).getTime() < now,
  );
  const daysOnMarket = Math.max(
    0,
    Math.floor((now - new Date(listing.created_at).getTime()) / 86_400_000),
  );
  const nextAction =
    overdueTasks.length > 0
      ? `${overdueTasks.length} overdue property follow-up${
          overdueTasks.length === 1 ? "" : "s"
        }`
      : offerCount > 0
        ? `Review ${offerCount} active offer${offerCount === 1 ? "" : "s"}`
        : hotBuyerCount > 0
          ? `Follow up with ${hotBuyerCount} hot buyer${
              hotBuyerCount === 1 ? "" : "s"
            }`
          : upcomingBookings.length > 0
            ? "Prepare for the next inspection"
            : enquiries.length > 0
              ? "Review the latest buyer enquiry"
              : "Connect the first buyer enquiry";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/deals"
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All properties
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-neutral-950 via-neutral-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 to-emerald-400 text-white shadow-lg ring-4 ring-white/10">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold capitalize text-emerald-200">
                  {listing.status || "active"}
                </span>
                <span className="text-xs capitalize text-white/50">
                  {listing.property_type || "Residential property"} ·{" "}
                  {listing.stage?.replaceAll("_", " ") || "Enquiry"}
                </span>
              </div>
              <h1 className="mt-2 max-w-3xl text-2xl font-bold sm:text-3xl">
                {listing.address}
              </h1>
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {formatPrice(listing.price)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/property/${listing.id}/facts`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <Target className="h-4 w-4" />
              Property facts
            </Link>
            <Link
              href="/inspections/slots"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <CalendarDays className="h-4 w-4" />
              Inspections
            </Link>
            <Link
              href={`/copilot?listing_id=${listing.id}`}
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
              label: "Interested clients",
              value: enquiries.length,
              icon: Users,
            },
            {
              label: "Conversation threads",
              value: conversationCount,
              icon: MessageCircle,
            },
            {
              label: "Upcoming inspections",
              value: upcomingBookings.length,
              icon: CalendarDays,
            },
            {
              label: "Offers",
              value: offerCount,
              icon: DollarSign,
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
                  Buyer and renter interest
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Every client keeps a separate enquiry and conversation context
                  for this property.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {enquiries.length} linked
              </span>
            </div>

            {enquiries.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-neutral-300" />
                <h3 className="mt-3 font-semibold text-neutral-800">
                  No clients linked yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                  Portal, email and CRM enquiries for this property will appear
                  here as distinct client relationships.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {enquiries.map((enquiry) => {
                  const client = enquiry.leads;
                  return (
                    <article
                      key={enquiry.id}
                      className="group rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-emerald-400 text-sm font-bold text-white">
                            {initials(client?.full_name || null)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-neutral-900">
                              {client?.full_name || "Unnamed client"}
                            </h3>
                            <p className="mt-0.5 text-xs capitalize text-neutral-500">
                              {enquiry.source} ·{" "}
                              {enquiry.conversations?.length || 0} conversation
                              {(enquiry.conversations?.length || 0) === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${enquiryStatusStyle(enquiry.status)}`}
                        >
                          {enquiry.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {client && enquiry.conversations?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {enquiry.conversations
                            .slice(0, 3)
                            .map((conversation) => (
                              <Link
                                key={conversation.id}
                                href={`/copilot?lead_id=${client.id}&listing_id=${listing.id}&enquiry_id=${enquiry.id}&conversation_id=${conversation.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold capitalize text-blue-700 transition hover:bg-blue-100"
                              >
                                <MessageCircle className="h-3 w-3" />
                                {conversation.channel} thread
                              </Link>
                            ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                        {client?.phone && (
                          <>
                            <a
                              href={`tel:${client.phone}`}
                              aria-label={`Call ${client.full_name || "client"}`}
                              className="rounded-xl p-2 text-neutral-400 transition hover:bg-white hover:text-emerald-600 hover:shadow-sm"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <a
                              href={`sms:${client.phone}`}
                              aria-label={`Message ${client.full_name || "client"}`}
                              className="rounded-xl p-2 text-neutral-400 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </>
                        )}
                        {client?.email && (
                          <a
                            href={`mailto:${client.email}`}
                            aria-label={`Email ${client.full_name || "client"}`}
                            className="rounded-xl p-2 text-neutral-400 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {client && (
                          <Link
                            href={`/copilot?lead_id=${client.id}&listing_id=${listing.id}&enquiry_id=${enquiry.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                          >
                            Ask Clippy
                            <Sparkles className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {client && (
                          <Link
                            href={`/clients/${client.id}`}
                            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                          >
                            Client 360
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
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
                  Property activity
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Recent messages across every client and connected channel.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {recentMessages.length} messages
              </span>
            </div>

            {recentMessages.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <MessageCircle className="h-5 w-5 text-neutral-400" />
                No messages linked to this property yet.
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
                        <span className="font-bold text-neutral-700">
                          {context?.client || "Client"}
                        </span>
                        <span className="capitalize text-neutral-500">
                          {context?.channel || "conversation"}
                        </span>
                        <span className="ml-auto text-neutral-400">
                          {formatDateTime(message.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                        {message.text || "Message content unavailable"}
                      </p>
                      {context?.leadId && (
                        <Link
                          href={`/clients/${context.leadId}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                        >
                          Open Client 360
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Inspections
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Upcoming appointments for this property.
                </p>
              </div>
              <Link
                href="/inspections"
                className="text-xs font-bold text-emerald-700"
              >
                View all
              </Link>
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <CalendarDays className="h-5 w-5 text-neutral-400" />
                No upcoming inspections booked.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingBookings.slice(0, 6).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {booking.leads?.full_name || "Inspection attendee"}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-neutral-500">
                        {formatDateTime(
                          booking.inspection_time_slots!.starts_at,
                        )}{" "}
                        ·{" "}
                        {booking.inspection_time_slots!.inspection_type.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold capitalize text-emerald-700">
                      {booking.booking_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-lg font-bold text-neutral-900">
                Follow-ups and reminders
              </h2>
              <CreateFollowUpButton
                listingId={listing.id}
                defaultTitle={`Follow up on ${listing.address}`}
              />
            </div>
            <div className="mt-4 space-y-3">
              {pendingTasks.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  No pending follow-ups for this property.
                </div>
              ) : (
                pendingTasks.slice(0, 6).map((task) => {
                  const overdue = new Date(task.due_at).getTime() < now;
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
                          copilotHref={`/copilot?listing_id=${listing.id}${
                            task.lead_id ? `&lead_id=${task.lead_id}` : ""
                          }`}
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
              This recommendation is calculated from this property&apos;s
              enquiries, inspections and pending reminders. Clippy opens with
              this property visibly selected and verified.
            </p>
            <Link
              href={`/copilot?listing_id=${listing.id}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Open Clippy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
            <h2 className="font-bold text-neutral-900">Property snapshot</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  icon: Bed,
                  label: "Bedrooms",
                  value: listing.bedrooms ?? "—",
                },
                {
                  icon: Bath,
                  label: "Bathrooms",
                  value: listing.bathrooms ?? "—",
                },
                {
                  icon: DollarSign,
                  label: "Price",
                  value: formatPrice(listing.price),
                },
                {
                  icon: CalendarDays,
                  label: "Days listed",
                  value: daysOnMarket,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-neutral-50 p-3">
                  <item.icon className="h-4 w-4 text-neutral-400" />
                  <p className="mt-2 truncate text-sm font-bold text-neutral-900">
                    {item.value}
                  </p>
                  <p className="text-[11px] text-neutral-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {listing.description && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <h2 className="font-bold text-neutral-900">Description</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {listing.description}
              </p>
            </div>
          )}

          {features.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <h2 className="font-bold text-neutral-900">Features</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-bold text-neutral-900">
              <Camera className="h-4 w-4 text-neutral-400" />
              Photos
            </h2>
            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {images.slice(0, 6).map((image, index) => (
                  <div
                    key={image}
                    className="aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${listing.address} photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-8 text-center">
                <Camera className="mx-auto h-7 w-7 text-neutral-300" />
                <p className="mt-2 text-xs text-neutral-500">
                  No property photos available.
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
