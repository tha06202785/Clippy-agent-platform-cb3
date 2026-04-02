import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Save,
  X,
  Plus,
  MapPin,
  Home,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  Loader,
  Eye,
  EyeOff,
  Radar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

// Supabase anon key for Edge Function authentication
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE";

interface AreaPreset {
  id: string;
  name: string;
  suburbs: string[];
  region_label: string;
}

interface Watchlist {
  id: string;
  user_id: string;
  region_label: string;
  search_mode: "preset" | "custom";
  suburbs: string[];
  property_mode: "rent" | "sale" | "both";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function MyWatchlists() {
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  // Data states
  const [availablePresets, setAvailablePresets] = useState<AreaPreset[]>([]);
  const [currentWatchlist, setCurrentWatchlist] = useState<Watchlist | null>(null);

  // Form states
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedPresetName, setSelectedPresetName] = useState("");
  const [searchMode, setSearchMode] = useState<"preset" | "custom">("preset");
  const [customSuburbInput, setCustomSuburbInput] = useState("");
  const [selectedCustomSuburbs, setSelectedCustomSuburbs] = useState<string[]>([]);
  const [propertyMode, setPropertyMode] = useState<"rent" | "sale" | "both">("both");
  const [isActive, setIsActive] = useState(true);

  // Notification states
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);

        // Get user session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session fetch timeout")), 8000)
        );

        const {
          data: { session },
        } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (!session?.user?.id) {
          console.warn("No active session, redirecting to login");
          navigate("/login");
          return;
        }

        console.log("✓ User session found:", session.user.id);
        setUserId(session.user.id);

        // Get user's org ID (non-blocking)
        try {
          const { data } = await supabase
            .from("user_org_roles")
            .select("org_id")
            .eq("user_id", session.user.id)
            .single();

          if (data) {
            setUserOrgId(data.org_id);
            console.log("✓ Org ID loaded:", data.org_id);
          }
        } catch (err) {
          console.warn("⚠ Could not fetch org_id:", err);
          // Non-blocking error - continue anyway
        }

        // Fetch area presets with anon key (non-blocking)
        try {
          await fetchAreaPresets();
        } catch (err) {
          console.warn("⚠ Could not fetch area presets:", err);
          setAvailablePresets([]);
        }

        // Fetch existing watchlist for this user (non-blocking)
        try {
          await fetchCurrentWatchlist(session.user.id);
        } catch (err) {
          console.warn("⚠ Could not fetch current watchlist:", err);
          // Show default form
        }

        setLoading(false);
      } catch (err: any) {
        console.error("❌ Initialization error:", err?.message || err);
        // Still load the page but show user message about connection issues
        setLoading(false);
        if (err?.message?.includes("timeout")) {
          showNotification("error", "Network connection slow - some features may be temporarily unavailable");
        }
      }
    };

    initialize();
  }, [navigate]);

  const fetchAreaPresets = async () => {
    try {
      console.log("📍 Fetching area presets with ANON KEY...");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(
          "https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/get-area-presets",
          {
            method: "GET",
            headers,
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);
        console.log("📥 Response Status:", response.status);

        const responseData = await response.json();

        if (response.ok) {
          console.log("✅ Presets loaded successfully:", responseData.length || 0, "presets");
          const presets = Array.isArray(responseData) ? responseData : responseData.presets || [];
          setAvailablePresets(presets);
        } else {
          console.warn("⚠ Failed to load presets, status:", response.status);
          setAvailablePresets([]);
        }
      } catch (timeoutErr: any) {
        clearTimeout(timeout);
        if (timeoutErr.name === "AbortError") {
          console.warn("⚠ Presets fetch timeout (10s)");
        } else {
          console.warn("⚠ Presets fetch error:", timeoutErr.message);
        }
        setAvailablePresets([]);
      }
    } catch (err: any) {
      console.error("❌ Unexpected error fetching presets:", err.message);
      setAvailablePresets([]);
    }
  };

  const fetchCurrentWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("suburb_watchlists")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        console.warn("Watchlist fetch error:", error);
        return;
      }

      // Handle 0 or 1 row
      if (data && data.length > 0) {
        const watchlist = data[0];
        setCurrentWatchlist(watchlist);
        setSelectedPresetId(watchlist.search_mode === "preset" ? watchlist.region_label : null);
        setSelectedPresetName(watchlist.region_label || "Custom Watchlist");
        setSearchMode(watchlist.search_mode || "custom");
        setSelectedCustomSuburbs(watchlist.suburbs || []);
        setPropertyMode(watchlist.property_mode || "both");
        setIsActive(watchlist.is_active ?? true);
      } else {
        // No existing watchlist — keep defaults
        console.log("No existing watchlist for user — using defaults");
      }
    } catch (err) {
      console.warn("Watchlist fetch failed:", err);
    }
  };

  const handleAddSuburb = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customSuburbInput.trim()) {
      e.preventDefault();
      const suburb = customSuburbInput.trim().toUpperCase();
      if (!selectedCustomSuburbs.includes(suburb)) {
        setSelectedCustomSuburbs([...selectedCustomSuburbs, suburb]);
      }
      setCustomSuburbInput("");
    }
  };

  const handleRemoveSuburb = (suburb: string) => {
    setSelectedCustomSuburbs(selectedCustomSuburbs.filter((s) => s !== suburb));
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = availablePresets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetName(preset.region_label);
      setSelectedCustomSuburbs(preset.suburbs);
      setSearchMode("preset");
    }
  };

  const handleSaveWatchlist = async () => {
    if (!userId) {
      showNotification("error", "User session not found");
      return;
    }

    if (searchMode === "custom" && selectedCustomSuburbs.length === 0) {
      showNotification("error", "Please add at least one suburb");
      return;
    }

    try {
      setSaving(true);

      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Session timeout")), 5000)
      );

      const {
        data: { session },
      } = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (!session?.access_token) {
        showNotification("error", "Authentication required - please refresh and try again");
        setSaving(false);
        return;
      }

      const payload = {
        watchlist_id: currentWatchlist?.id || null,
        user_id: userId,
        org_id: userOrgId,
        region_label: selectedPresetName || "Custom Watchlist",
        search_mode: searchMode,
        suburbs: selectedCustomSuburbs,
        property_mode: propertyMode,
        is_active: isActive,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout for save

      try {
        const response = await fetch(
          "https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/save-agent-watchlist",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);
        const result = await response.json();
        console.log("✓ Watchlist saved, status:", response.status);

        if (response.ok) {
          setCurrentWatchlist(result.watchlist);
          showNotification("success", "Watchlist saved successfully!");

          // Auto-dismiss notification after 3 seconds
          setTimeout(() => {
            setNotification(null);
          }, 3000);
        } else {
          console.warn("Save failed with status", response.status);
          showNotification("error", result?.message || "Failed to save watchlist");
        }
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr.name === "AbortError") {
          console.warn("⚠ Save request timeout");
          showNotification("error", "Save request timed out - please try again");
        } else {
          console.warn("⚠ Save request failed:", fetchErr.message);
          showNotification("error", "Network error - please try again");
        }
      }
    } catch (err: any) {
      console.error("Save error:", err?.message || err);
      showNotification("error", err?.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  if (loading) {
    return (
      <Layout showNav={true}>
        <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
        <div className="max-w-4xl mx-auto flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cyan-200">Loading your watchlists...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      {/* Deep Navy Background */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />

      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/15 to-blue-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/12 to-cyan-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      </div>

      {/* Premium Animated Radar Grid Background - Ultra Faint Breathing */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.12] sm:opacity-[0.14] md:opacity-[0.16] animate-pulse" preserveAspectRatio="none" style={{ animationDuration: "12s", animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <defs>
            <pattern id="radar-grid-watchlist" x="60" y="60" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="30" fill="none" stroke="#06b6d4" strokeWidth="0.8" opacity="0.5" />
              <circle cx="30" cy="30" r="18" fill="none" stroke="#0ea5e9" strokeWidth="0.6" opacity="0.4" />
              <circle cx="30" cy="30" r="6" fill="none" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
              <line x1="0" y1="30" x2="60" y2="30" stroke="#06b6d4" strokeWidth="0.6" opacity="0.3" />
              <line x1="30" y1="0" x2="30" y2="60" stroke="#06b6d4" strokeWidth="0.6" opacity="0.3" />
              <circle cx="30" cy="30" r="2" fill="#0ea5e9" opacity="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid-watchlist)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-pulse" style={{ animationDuration: "8s" }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 px-4 py-8">
        {/* Header - Responsive */}
        <div className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30 flex-shrink-0">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-500">
                Manage Watched Areas
              </h1>
              <p className="text-xs sm:text-sm text-cyan-200/80 font-semibold mt-1 md:mt-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                Define suburbs & property types for AI
              </p>
            </div>
          </div>
        </div>

        {/* Floating AI Suggests Box - Premium Edition with Ultimate Shimmer & 2s Pulse */}
        {availablePresets.length > 0 && (
          <div className="fixed bottom-6 right-6 md:bottom-auto md:top-32 md:right-8 max-w-xs z-40 animate-in slide-in-from-right-8 duration-700">
            <style>{`
              @keyframes fadeInSlideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes shimmer-premium {
                0% { transform: translateX(-100%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
              }
              @keyframes gentle-pulse {
                0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 20px rgba(6, 182, 212, 0.1); }
                50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6), inset 0 0 30px rgba(6, 182, 212, 0.15); }
              }
              .shimmer-gradient {
                animation: shimmer-premium 2s infinite;
              }
              .pulse-glow {
                animation: gentle-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              }
            `}</style>
            <div className="relative group cursor-pointer">
              {/* Quad-layer glow system */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/80 via-blue-500/80 to-cyan-500/80 rounded-2xl blur-2xl opacity-80 group-hover:opacity-100 animate-pulse transition-opacity" style={{ animationDuration: "2s" }} />
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/50 via-blue-400/50 to-cyan-400/50 rounded-2xl blur-xl opacity-60 group-hover:opacity-75 animate-pulse transition-opacity" style={{ animationDuration: "3s", animationDelay: "0.3s" }} />
              <div className="absolute -inset-3 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-2xl blur-3xl opacity-40 group-hover:opacity-60 animate-pulse transition-opacity" style={{ animationDuration: "4s", animationDelay: "0.6s" }} />

              <div className="relative pulse-glow bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 rounded-2xl p-4 md:p-5 border-2 border-cyan-400/80 group-hover:border-cyan-200 shadow-2xl shadow-cyan-500/60 group-hover:shadow-cyan-400/90 transition-all duration-400 backdrop-blur-xl group-hover:scale-110 group-hover:-translate-y-2 active:scale-95 overflow-hidden" style={{ animationPlayState: 'running' }}>
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 bg-gradient-to-br from-cyan-400/70 to-blue-500/70 rounded-lg animate-pulse border border-cyan-300/90 shadow-lg shadow-cyan-400/60 flex-shrink-0" style={{ animationDuration: "1.2s" }}>
                      <Sparkles className="w-4 h-4 text-cyan-50 drop-shadow-lg animate-pulse" style={{ animationDuration: "1.5s" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-cyan-100 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">💡 AI SUGGESTS</p>
                      <p className="text-xs md:text-sm font-bold text-white mt-0.5 drop-shadow line-clamp-1">Enable alerts for smarter matching</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-cyan-100 group-hover:translate-x-2 transition-transform flex-shrink-0" />
                </div>

                {/* Triple-layer shimmer effect - Premium smooth gradient */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-0 group-hover:opacity-60 transition-opacity duration-300">
                  <div className="absolute inset-0 shimmer-gradient" style={{
                    background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)",
                    width: "100%",
                    height: "100%"
                  }} />
                </div>
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-0 group-hover:opacity-40 transition-opacity duration-300">
                  <div className="absolute inset-0 shimmer-gradient" style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    width: "100%",
                    height: "100%",
                    animationDelay: "0.3s"
                  }} />
                </div>
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-0 group-hover:opacity-30 transition-opacity duration-300">
                  <div className="absolute inset-0 shimmer-gradient" style={{
                    background: "linear-gradient(90deg, transparent, rgba(94,234,212,0.3), transparent)",
                    width: "100%",
                    height: "100%",
                    animationDelay: "0.6s"
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast - Responsive positioning */}
        {notification && (
          <div
            className={`fixed bottom-4 right-4 md:top-8 md:bottom-auto md:right-8 max-w-xs md:max-w-sm z-50 animate-in slide-in-from-top-4 duration-300 rounded-2xl border-2 p-4 md:p-5 shadow-2xl backdrop-blur-xl ${
              notification.type === "success"
                ? "bg-emerald-900/80 border-emerald-400/80 shadow-emerald-500/40"
                : "bg-red-900/80 border-red-400/80 shadow-red-500/40"
            }`}
          >
            <div className="flex items-start gap-3 md:gap-4">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-300 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-bold text-sm md:text-base ${notification.type === "success" ? "text-emerald-200" : "text-red-200"}`}>
                  {notification.type === "success" ? "Success" : "Error"}
                </p>
                <p className={`text-xs md:text-sm mt-0.5 md:mt-1 ${notification.type === "success" ? "text-emerald-300/80" : "text-red-300/80"}`}>
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Container - Responsive spacing */}
        <div className="space-y-6 md:space-y-8">
          {/* Section 1: Region Presets - PREMIUM EDITION */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/60 p-4 md:p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.5) 100%)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/40 to-blue-600/25 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-3xl hidden md:block" />

            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-cyan-400/60 to-blue-500/50 rounded-lg border border-cyan-300/70 shadow-lg shadow-cyan-400/50 flex-shrink-0 group-hover:shadow-cyan-400/70 transition-all">
                <Home className="w-4 h-4 md:w-5 md:h-5 text-cyan-100 animate-pulse" style={{ animationDuration: "3s" }} />
              </div>
              <h2 className="text-lg md:text-2xl font-black bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">1. Region Presets</h2>
            </div>

            <p className="text-xs md:text-sm text-cyan-200/70 mb-4 md:mb-6 font-semibold">Select pre-defined areas</p>

            <div className="space-y-3 md:space-y-4">
              {availablePresets.length > 0 ? (
                <div className="grid gap-2 md:gap-3">
                  {availablePresets.map((preset, idx) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetChange(preset.id)}
                      className={`relative p-3 md:p-4 rounded-xl border-2 text-left group/preset touch-manipulation overflow-hidden transition-all duration-500 ${
                        searchMode === "preset" && selectedPresetId === preset.id
                          ? "bg-cyan-500/25 border-cyan-400/90 shadow-lg shadow-cyan-500/50"
                          : "bg-slate-800/40 border-cyan-400/40 hover:border-cyan-400/60 hover:shadow-2xl hover:shadow-cyan-500/40 hover:-translate-y-1.5 sm:hover:-translate-y-2 md:hover:-translate-y-1.5"
                      } animate-in fade-in duration-700 sm:duration-600 md:duration-500`}
                      style={{
                        animation: `fadeInSlideUp 700ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                      }}
                    >
                      {/* Hover glow background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover/preset:opacity-100 transition-opacity duration-300 blur-2xl" />

                      {/* Selected card pulsing border effect */}
                      {searchMode === "preset" && selectedPresetId === preset.id && (
                        <>
                          <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/80 opacity-70 animate-pulse" style={{ animationDuration: "2s", animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }} />
                          <div className="absolute inset-0 rounded-xl shadow-lg shadow-cyan-400/40 animate-pulse" style={{ animationDuration: "2s", animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }} />
                        </>
                      )}

                      <div className="flex items-start justify-between gap-2 relative z-10">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm md:text-base bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent drop-shadow truncate drop-shadow-[0_0_12px_rgba(6,182,212,0.45)] group-hover/preset:drop-shadow-[0_0_18px_rgba(6,182,212,0.65)] transition-all duration-400">
                            {preset.region_label}
                          </p>
                          <p className="text-xs md:text-sm text-cyan-200/70 mt-1 md:mt-2 line-clamp-2 font-semibold">
                            {preset.suburbs.length} suburbs • {preset.suburbs.slice(0, 3).join(", ")}
                            {preset.suburbs.length > 3 && "..."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {searchMode === "preset" && selectedPresetId === preset.id && (
                            <Radar className="w-4 h-4 md:w-5 md:h-5 text-cyan-300 animate-pulse flex-shrink-0" style={{ animationDuration: "2s" }} />
                          )}
                          <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            searchMode === "preset" && selectedPresetId === preset.id
                              ? "bg-cyan-400 border-cyan-200 shadow-lg shadow-cyan-400/60"
                              : "border-cyan-400/50 group-hover/preset:border-cyan-400/80"
                          }`}>
                            {searchMode === "preset" && selectedPresetId === preset.id && (
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 md:p-6 bg-slate-800/40 rounded-xl border border-cyan-400/20 animate-in fade-in duration-500">
                  <p className="text-cyan-300/70 text-sm md:text-base font-semibold">
                    📍 No presets found – add custom suburbs below
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Custom Suburbs - PREMIUM EDITION */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/60 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.5) 100%)", animationDelay: "100ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/40 to-blue-600/25 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-3xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/60 to-blue-500/50 rounded-lg border border-cyan-300/70 shadow-lg shadow-cyan-400/50 group-hover:shadow-cyan-400/70 transition-all">
                <Plus className="w-5 h-5 text-cyan-100 animate-pulse" style={{ animationDuration: "2.5s" }} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">2. Add Custom Suburbs</h2>
            </div>

            <p className="text-cyan-200/70 mb-6 font-semibold">Type a suburb name and press Enter to add it</p>

            <input
              type="text"
              value={customSuburbInput}
              onChange={(e) => setCustomSuburbInput(e.target.value)}
              onKeyPress={handleAddSuburb}
              placeholder="e.g., Eastwood, Parramatta, Bondi..."
              className="w-full px-4 py-3 bg-slate-800/60 border-2 border-cyan-400/40 rounded-xl text-white placeholder-cyan-200/40 focus:outline-none focus:border-cyan-300 focus:shadow-lg focus:shadow-cyan-500/40 transition-all drop-shadow"
            />

            {selectedCustomSuburbs.length > 0 && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-600" style={{ animationDelay: `${(availablePresets.length * 80) + 100}ms` }}>
                <p className="text-sm text-cyan-200/60 font-semibold mb-3">Selected Suburbs ({selectedCustomSuburbs.length})</p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {selectedCustomSuburbs.map((suburb, idx) => (
                    <div
                      key={suburb}
                      className="relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400/60 rounded-full group/tag hover:border-cyan-300 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-104 sm:hover:scale-105 hover:-translate-y-1.5 sm:hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                      style={{
                        animation: `fadeInSlideUp 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        animationDelay: `${(availablePresets.length * 80) + 150 + idx * 60}ms`
                      }}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/40 to-blue-400/30 rounded-full opacity-0 group-hover/tag:opacity-100 transition-opacity duration-400 blur-lg -z-10" />

                      <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.35)] group-hover/tag:drop-shadow-[0_0_14px_rgba(6,182,212,0.55)] transition-all duration-400">{suburb}</span>
                      <button
                        onClick={() => handleRemoveSuburb(suburb)}
                        className="ml-0.5 sm:ml-1 p-0.5 hover:bg-red-500/60 rounded-full transition-all opacity-60 hover:opacity-100 group-hover/tag:scale-120 duration-300"
                      >
                        <X className="w-3 sm:w-4 h-3 sm:h-4 text-cyan-300 group-hover/tag:text-red-300 transition-colors duration-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Property Focus - PREMIUM EDITION */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/60 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.5) 100%)", animationDelay: "200ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/40 to-blue-600/25 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-3xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/60 to-blue-500/50 rounded-lg border border-cyan-300/70 shadow-lg shadow-cyan-400/50 group-hover:shadow-cyan-400/70 transition-all">
                <Settings className="w-5 h-5 text-cyan-100 animate-pulse" style={{ animationDuration: "3s" }} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">3. Property Focus</h2>
            </div>

            <p className="text-cyan-200/70 mb-6 font-semibold">Select the type of properties to monitor</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["rent", "sale", "both"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPropertyMode(mode)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 font-bold capitalize group/mode ${
                    propertyMode === mode
                      ? "bg-cyan-500/20 border-cyan-400/80 shadow-lg shadow-cyan-500/40 text-cyan-200"
                      : "bg-slate-800/40 border-cyan-400/30 hover:border-cyan-400/60 text-cyan-300/70 hover:text-cyan-300"
                  }`}
                >
                  {mode === "rent" && "🏠 Rental"}
                  {mode === "sale" && "🏡 For Sale"}
                  {mode === "both" && "📊 Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Watchlist Status - PREMIUM EDITION */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/60 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.5) 100%)", animationDelay: "300ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/40 to-blue-600/25 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-3xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/60 to-blue-500/50 rounded-lg border border-cyan-300/70 shadow-lg shadow-cyan-400/50 group-hover:shadow-cyan-400/70 transition-all">
                <ToggleRight className="w-5 h-5 text-cyan-100 animate-pulse" style={{ animationDuration: "2.5s" }} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">4. Watchlist Status</h2>
            </div>

            <p className="text-cyan-200/70 mb-6 font-semibold">Enable or disable AI alerts for this watchlist</p>

            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between font-bold ${
                isActive
                  ? "bg-emerald-500/20 border-emerald-400/80 shadow-lg shadow-emerald-500/40"
                  : "bg-red-500/20 border-red-400/80 shadow-lg shadow-red-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                {isActive ? (
                  <Eye className="w-5 h-5 text-emerald-300" />
                ) : (
                  <EyeOff className="w-5 h-5 text-red-300" />
                )}
                <span className={isActive ? "text-emerald-200" : "text-red-200"}>
                  {isActive ? "✓ Watchlist Active" : "✗ Watchlist Inactive"}
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                isActive
                  ? "bg-emerald-400 border-emerald-300"
                  : "border-red-400/40"
              }`}>
                {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          </div>

          {/* Save Button - PREMIUM EDITION */}
          <button
            onClick={handleSaveWatchlist}
            disabled={saving}
            className="group/save w-full relative inline-flex items-center justify-center gap-3 px-8 py-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-2xl font-black text-lg transition-all duration-300 hover:shadow-3xl hover:shadow-cyan-500/90 hover:scale-105 hover:-translate-y-1 active:scale-95 border-2 border-cyan-300/90 group-hover/save:border-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "400ms" }}
          >
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 rounded-2xl blur-xl opacity-70 group-hover/save:opacity-100 -z-10 animate-pulse" style={{ animationDuration: "1.2s" }} />
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/50 to-blue-400/50 rounded-2xl blur-2xl opacity-50 group-hover/save:opacity-70 -z-10 animate-pulse" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
            {saving ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-6 h-6 group-hover/save:rotate-12 group-hover/save:scale-110 transition-transform" />
                Save Watchlist
              </>
            )}
          </button>

          {/* Info Text - PREMIUM EDITION */}
          <div className="relative p-4 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 border-2 border-cyan-400/40 rounded-xl text-cyan-200/80 text-sm font-semibold group hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20 transition-all animate-in fade-in duration-500" style={{ animationDelay: "500ms" }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            💡 <span className="text-cyan-100 font-bold">Your AI watchlist</span> helps the AI focus on the suburbs and property types that matter most to you. Updates take effect immediately.
          </div>
        </div>
      </div>
    </Layout>
  );
}
