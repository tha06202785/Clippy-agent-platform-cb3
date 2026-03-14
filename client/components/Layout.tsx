import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Search,
  Plus,
  Menu,
  X,
  Radar,
  ChevronDown,
  Sparkles,
  Mic,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile-first
  const [adminOpen, setAdminOpen] = useState(false);
  const [radarOpen, setRadarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile menu state
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const navigationItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/ai-radar", label: "AI Radar", icon: Radar, premium: true },
    { path: "/inbox", label: "Lead Inbox", icon: Inbox },
    { path: "/ai-inbox", label: "AI Inbox", icon: Sparkles, premium: true },
    { path: "/copilot", label: "Copilot", icon: Mic, premium: true },
    { path: "/listings", label: "Listings", icon: FileText },
    { path: "/planner", label: "Planner", icon: Calendar },
  ];

  const adminItems = [
    { path: "/integrations", label: "Integrations", icon: Settings },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Hidden on mobile, visible on lg+ screens */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden hidden lg:flex`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between h-20">
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">
                Clippy
              </span>
            </Link>
          )}
          {!sidebarOpen && (
            <Link
              to="/dashboard"
              className="w-full flex justify-center"
              title="Clippy"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isPremium = item.premium;
            const hasSubmenu = item.label === "AI Radar";

            if (hasSubmenu) {
              return (
                <div key={item.path}>
                  <button
                    onClick={() => setRadarOpen(!radarOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                      active
                        ? "bg-gradient-to-r from-primary/40 to-primary/20 text-primary-foreground shadow-lg shadow-primary/30 border border-primary/50"
                        : "text-primary hover:bg-primary/10 hover:shadow-md hover:shadow-primary/20"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "animate-pulse" : ""}`} />
                    {sidebarOpen && (
                      <>
                        <span className="font-medium">{item.label}</span>
                        <span className="ml-auto text-xs bg-gradient-to-r from-primary to-primary/70 text-white px-2 py-0.5 rounded-full font-semibold">
                          AI
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            radarOpen ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                    {!active && (
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>

                  {/* AI Radar Submenu */}
                  {radarOpen && sidebarOpen && (
                    <div className="mt-1 ml-2 pl-2 border-l-2 border-primary/40 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        to="/ai-radar"
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                          isActive("/ai-radar")
                            ? "bg-primary/30 text-primary-foreground"
                            : "text-primary/80 hover:bg-primary/10"
                        }`}
                      >
                        <span className="font-medium">Dashboard</span>
                      </Link>
                      <Link
                        to="/ai-radar/my-watchlists"
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                          isActive("/ai-radar/my-watchlists")
                            ? "bg-primary/30 text-primary-foreground"
                            : "text-primary/80 hover:bg-primary/10"
                        }`}
                      >
                        <span className="font-medium">My Watchlists</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}

          {/* Admin Section */}
          <div className="pt-2 mt-4 border-t border-sidebar-border">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors group"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="font-medium text-sm">Admin</span>
                  <ChevronDown
                    className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                      adminOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

            {/* Admin Submenu */}
            {adminOpen && sidebarOpen && (
              <div className="mt-1 ml-2 pl-2 border-l-2 border-sidebar-accent space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Responsive */}
        <header className="bg-card border-b border-border h-16 md:h-20 flex items-center justify-between px-3 md:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>

          <div className="hidden lg:flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 rounded-lg border border-input bg-background text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex lg:hidden flex-1 justify-center">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="hidden md:flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm md:text-base">
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden lg:inline">Quick Add</span>
            </button>

            <button className="md:hidden p-2 rounded-lg hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </button>

            <div className="hidden md:flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs md:text-sm font-bold text-primary">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs md:text-sm font-semibold text-foreground truncate max-w-xs">
                  {user?.email?.split("@")[0] || "Agent"}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-sidebar border-b border-sidebar-border px-3 py-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Content Area - Responsive padding */}
        <main className="flex-1 overflow-auto">
          <div className="p-3 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
