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
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

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

        // Get user session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          navigate("/login");
          return;
        }

        setUserId(session.user.id);

        // Get user's org ID
        try {
          const { data } = await supabase
            .from("user_org_roles")
            .select("org_id")
            .eq("user_id", session.user.id)
            .single();

          if (data) {
            setUserOrgId(data.org_id);
          }
        } catch (err) {
          console.warn("Could not fetch org_id:", err);
        }

        // Fetch area presets
        await fetchAreaPresets();

        // Fetch existing watchlist for this user
        await fetchCurrentWatchlist(session.user.id);

        setLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setLoading(false);
      }
    };

    initialize();
  }, [navigate]);

  const fetchAreaPresets = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const response = await fetch(
        "https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/get-area-presets",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailablePresets(data.presets || []);
      } else {
        console.warn("Failed to fetch area presets:", response.statusText);
      }
    } catch (err) {
      console.error("Error fetching area presets:", err);
    }
  };

  const fetchCurrentWatchlist = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("agent_watchlists")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setCurrentWatchlist(data);
        setSelectedPresetId(data.search_mode === "preset" ? data.region_label : null);
        setSelectedPresetName(data.region_label);
        setSearchMode(data.search_mode);
        setSelectedCustomSuburbs(data.suburbs);
        setPropertyMode(data.property_mode);
        setIsActive(data.is_active);
      }
    } catch (err) {
      console.warn("No existing watchlist found:", err);
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        showNotification("error", "Authentication required");
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

      const response = await fetch(
        "https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/save-agent-watchlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setCurrentWatchlist(result.watchlist);
        showNotification("success", "Watchlist saved successfully!");

        // Auto-dismiss notification after 3 seconds
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      } else {
        const error = await response.json();
        showNotification("error", error.message || "Failed to save watchlist");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      showNotification("error", err.message || "An error occurred while saving");
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
      {/* Background */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/8 to-cyan-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 px-4 py-8">
        {/* Header */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
              <MapPin className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                Manage My Watched Areas
              </h1>
              <p className="text-sm text-cyan-200/80 font-semibold mt-2 drop-shadow">
                Define the suburbs and property types for your AI Market Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-8 right-8 max-w-sm z-50 animate-in slide-in-from-top-4 duration-300 rounded-2xl border-2 p-5 shadow-2xl backdrop-blur-xl ${
              notification.type === "success"
                ? "bg-emerald-900/80 border-emerald-400/80 shadow-emerald-500/40"
                : "bg-red-900/80 border-red-400/80 shadow-red-500/40"
            }`}
          >
            <div className="flex items-start gap-4">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-300 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-300 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-bold ${notification.type === "success" ? "text-emerald-200" : "text-red-200"}`}>
                  {notification.type === "success" ? "Success" : "Error"}
                </p>
                <p className={`text-sm mt-1 ${notification.type === "success" ? "text-emerald-300/80" : "text-red-300/80"}`}>
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Container */}
        <div className="space-y-8">
          {/* Section 1: Region Presets */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/50 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/40 rounded-lg border border-cyan-300/60 shadow-lg shadow-cyan-400/40">
                <Home className="w-5 h-5 text-cyan-200" />
              </div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">1. Region Presets</h2>
            </div>

            <p className="text-cyan-200/70 mb-6 font-semibold">Select pre-defined areas or create custom suburbs</p>

            <div className="space-y-4">
              {availablePresets.length > 0 ? (
                <div className="grid gap-3">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetChange(preset.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left group/preset ${
                        searchMode === "preset" && selectedPresetId === preset.id
                          ? "bg-cyan-500/20 border-cyan-400/80 shadow-lg shadow-cyan-500/40"
                          : "bg-slate-800/40 border-cyan-400/30 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-white drop-shadow">{preset.region_label}</p>
                          <p className="text-sm text-cyan-200/60 mt-2">
                            {preset.suburbs.length} suburbs • {preset.suburbs.slice(0, 3).join(", ")}
                            {preset.suburbs.length > 3 && "..."}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          searchMode === "preset" && selectedPresetId === preset.id
                            ? "bg-cyan-400 border-cyan-300"
                            : "border-cyan-400/40 group-hover/preset:border-cyan-400"
                        }`}>
                          {searchMode === "preset" && selectedPresetId === preset.id && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-800/40 rounded-lg border border-cyan-400/20 text-cyan-300/60">
                  No presets available
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Custom Suburbs */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/50 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)", animationDelay: "100ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/40 rounded-lg border border-cyan-300/60 shadow-lg shadow-cyan-400/40">
                <Plus className="w-5 h-5 text-cyan-200" />
              </div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">2. Add Custom Suburbs</h2>
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
              <div className="mt-6">
                <p className="text-sm text-cyan-200/60 font-semibold mb-3">Selected Suburbs ({selectedCustomSuburbs.length})</p>
                <div className="flex flex-wrap gap-3">
                  {selectedCustomSuburbs.map((suburb) => (
                    <div
                      key={suburb}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400/60 rounded-full group/tag hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                    >
                      <span className="text-sm font-bold text-cyan-200 drop-shadow">{suburb}</span>
                      <button
                        onClick={() => handleRemoveSuburb(suburb)}
                        className="ml-1 p-0.5 hover:bg-red-500/40 rounded-full transition-all opacity-70 hover:opacity-100"
                      >
                        <X className="w-4 h-4 text-cyan-300 group-hover/tag:text-red-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Property Focus */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/50 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)", animationDelay: "200ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/40 rounded-lg border border-cyan-300/60 shadow-lg shadow-cyan-400/40">
                <Settings className="w-5 h-5 text-cyan-200" />
              </div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">3. Property Focus</h2>
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

          {/* Section 4: Watchlist Status */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/50 p-8 group backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)", animationDelay: "300ms" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/40 rounded-lg border border-cyan-300/60 shadow-lg shadow-cyan-400/40">
                <ToggleRight className="w-5 h-5 text-cyan-200" />
              </div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">4. Watchlist Status</h2>
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

          {/* Save Button */}
          <button
            onClick={handleSaveWatchlist}
            disabled={saving}
            className="group/save w-full relative inline-flex items-center justify-center gap-3 px-8 py-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-2xl font-black text-lg transition-all duration-300 hover:shadow-3xl hover:shadow-cyan-500/80 hover:scale-105 active:scale-95 border-2 border-cyan-300/80 group-hover/save:border-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "400ms" }}
          >
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/60 to-blue-500/60 rounded-2xl blur-xl opacity-60 group-hover/save:opacity-100 -z-10 animate-pulse" />
            {saving ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-6 h-6 group-hover/save:rotate-12 transition-transform" />
                Save Watchlist
              </>
            )}
          </button>

          {/* Info Text */}
          <div className="p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-xl text-cyan-200/70 text-sm font-semibold">
            💡 Your watchlist helps the AI focus on the suburbs and property types that matter most to you. Updates take effect immediately.
          </div>
        </div>
      </div>
    </Layout>
  );
}
