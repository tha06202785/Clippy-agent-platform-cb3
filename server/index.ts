import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { draftReply, generateListing, transcribe, qualifyLead } from "./routes/ai";
import { schedulePost, getScheduledPosts, deletePost, getPageStats, setupAutoReply } from "./routes/facebook";
import { getPlans, getSubscription, createCheckout, cancelSubscription, updatePaymentMethod, getBillingHistory, trackUsage, getUsageStats } from "./routes/subscriptions";
import webhookRouter from "./webhooks";
import { googleAuthRedirect, googleAuthCallback, getCalendarEvents, createCalendarEvent, calendarStatus } from "./routes/google";
import authRouter from "./routes/auth";
import { getLeads, createLead, updateLead, deleteLead } from "./routes/leads";
import { getListings, createListing, updateListing, deleteListing } from "./routes/listings";
import { getDashboardStats } from "./routes/dashboard";
export function createServer() {
 const app = express();
 app.set('trust proxy', 1);

 // Middleware
 app.use(cors());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping, timestamp: new Date().toISOString() });
  });

  app.get("/api/demo", handleDemo);

  // AI API Routes
  app.post("/api/ai/draft-reply", draftReply);
  app.post("/api/ai/generate-listing", generateListing);
  app.post("/api/ai/transcribe", transcribe);
  app.post("/api/ai/qualify-lead", qualifyLead);

  // Facebook API Routes
  app.post("/api/facebook/schedule", schedulePost);
  app.get("/api/facebook/scheduled", getScheduledPosts);
  app.delete("/api/facebook/posts/:post_id", deletePost);
  app.get("/api/facebook/stats", getPageStats);
  app.post("/api/facebook/auto-reply", setupAutoReply);

  // Subscription/Billing API Routes
  app.get("/api/subscription/plans", getPlans);
  app.get("/api/subscription/current", getSubscription);
  app.post("/api/subscription/checkout", createCheckout);
  app.post("/api/subscription/cancel", cancelSubscription);
  app.post("/api/subscription/payment-method", updatePaymentMethod);
  app.get("/api/subscription/billing-history", getBillingHistory);
  app.get("/api/subscription/usage", getUsageStats);
  app.post("/api/subscription/track-usage", trackUsage);


  // Google Calendar Routes
  app.get('/api/google/auth', googleAuthRedirect);
  app.get('/api/google/callback', googleAuthCallback);
  app.get('/api/google/calendar/events', getCalendarEvents);
  app.post('/api/google/calendar/events', createCalendarEvent);
  app.get('/api/google/calendar/status', calendarStatus);
  // Webhook routes for lead capture
  app.use("/api", webhookRouter);

  // Auth routes
  app.use("/api/auth", authRouter);

  // Leads routes
  app.get("/api/leads", getLeads);
  app.post("/api/leads", createLead);
  app.put("/api/leads/:id", updateLead);
  app.delete("/api/leads/:id", deleteLead);

  // Listings routes
  app.get("/api/listings", getListings);
  app.post("/api/listings", createListing);
  app.put("/api/listings/:id", updateListing);
  app.delete("/api/listings/:id", deleteListing);

  // Dashboard routes
  app.get("/api/dashboard/stats", getDashboardStats);

  return app;
}
