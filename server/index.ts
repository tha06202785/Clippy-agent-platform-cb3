import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import leadsRouter from "./routes/leads";
import listingsRouter from "./routes/listings";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";

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
