import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";

// In-memory store for demo - replace with Drizzle DB
const leads = [
  { id: "1", name: "Sarah Johnson", email: "sarah@email.com", phone: "0401 234 567", status: "hot", source: "Website", lastContact: "2m ago", preview: "Looking for a 3-bed house in Paddington" },
  { id: "2", name: "James Wilson", email: "james@email.com", phone: "0402 345 678", status: "warm", source: "Facebook", lastContact: "1h ago", preview: "Interested in investment properties" },
  { id: "3", name: "Emma Chen", email: "emma@email.com", phone: "0403 456 789", status: "new", source: "Referral", lastContact: "3h ago", preview: "First home buyer, pre-approved" },
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const newLead = { id: String(leads.length + 1), ...body, lastContact: "just now" };
  leads.push(newLead);
  return NextResponse.json(newLead, { status: 201 });
}
