import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import leadsRouter from "./routes/leads";
import listingsRouter from "./routes/listings";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";
import dashboardRouter from "./routes/dashboard";
import logsRouter from "./routes/logs";

// New integration modules
const authRoutes = require("./auth/routes");
const subscriptionRoutes = require("./subscription/routes");
const facebookRoutes = require("./facebook/routes");
const calendarRoutes = require("./calendar/routes");
const crmRoutes = require("./crm/crmRoutes");

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // API Routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Core API Routes
  app.use("/api/leads", leadsRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/logs", logsRouter);

  // New Integration Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/facebook", facebookRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/crm", crmRoutes);

  // Webhooks (no auth required)
  app.use("/webhooks/stripe", require("./subscription/webhookHandler").handleWebhook);
  app.use("/webhooks/facebook", require("./facebook/webhookHandler").handleWebhookEvent);

  // Error handling
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("API Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal server error" 
    });
  });

  return app;
}
