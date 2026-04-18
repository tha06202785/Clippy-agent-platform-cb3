import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AIRadar from "./pages/AIRadar";
import MyWatchlists from "./pages/MyWatchlists";
import LeadInbox from "./pages/LeadInbox";
import AIInbox from "./pages/AIInbox";
import CopilotMobile from "./pages/CopilotMobile";
import Listings from "./pages/Listings";
import Planner from "./pages/Planner";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import WidgetEmbed from "./pages/WidgetEmbed";
import Landing from "./pages/Landing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Global Clippy Widget - Renders on all pages */}
        <CopilotMobile />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ai-radar" element={<AIRadar />} />
          <Route path="/ai-radar/my-watchlists" element={<MyWatchlists />} />
          <Route path="/inbox" element={<LeadInbox />} />
          <Route path="/ai-inbox" element={<AIInbox />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/widget" element={<WidgetEmbed />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
