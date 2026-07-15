import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatWidgetWrapper } from "@/components/chat-widget-wrapper";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clippy - AI Co-Agent for Real Estate",
  description: "Clippy reads every lead, drafts every reply, and keeps every deal moving. You approve before anything leaves.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1><p className="text-muted-foreground">We have been notified. Please try again.</p></div></div>}>
          {children}
        </Sentry.ErrorBoundary>

      </body>
    </html>
  );
}
