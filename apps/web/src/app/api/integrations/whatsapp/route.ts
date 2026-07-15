import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// WhatsApp Business API integration
// Status: coming_soon — requires WhatsApp Business API approval from Meta

export async function GET() {
  return NextResponse.json({
    provider: "whatsapp",
    status: "coming_soon",
    message: "WhatsApp integration is coming soon. To enable it now, you need:",
    requirements: [
      "WhatsApp Business API approval from Meta",
      "A WhatsApp Business account",
      "A verified business phone number",
      "A Meta Business Manager account",
    ],
    setup_url: "https://business.whatsapp.com/",
    learn_more_url: "https://developers.facebook.com/docs/whatsapp",
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "WhatsApp integration is not yet available. Contact support to join the beta." },
    { status: 501 }
  );
}
