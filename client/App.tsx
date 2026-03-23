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
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import ContentPage from "./pages/ContentPage";
import VoicePage from "./pages/VoicePage";
import IntegrationsNewPage from "./pages/IntegrationsNewPage";
import LogsPage from "./pages/LogsPage";
import AutomationPage from "./pages/AutomationPage";

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/integrations-new" element={<IntegrationsNewPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/ai-radar" element={<AIRadar />} />
          <Route path="/ai-radar/my-watchlists" element={<MyWatchlists />} />
          <Route path="/inbox" element={<LeadInbox />} />
          <Route path="/ai-inbox" element={<AIInbox />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
