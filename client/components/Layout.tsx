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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
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
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden`}
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
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                  active
                    ? isPremium
                      ? "bg-gradient-to-r from-primary/40 to-primary/20 text-primary-foreground shadow-lg shadow-primary/30 border border-primary/50"
                      : "bg-sidebar-primary text-sidebar-primary-foreground"
                    : isPremium
                    ? "text-primary hover:bg-primary/10 hover:shadow-md hover:shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isPremium && active ? "animate-pulse" : ""}`} />
                {sidebarOpen && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {isPremium && (
                      <span className="ml-auto text-xs bg-gradient-to-r from-primary to-primary/70 text-white px-2 py-0.5 rounded-full font-semibold">
                        AI
                      </span>
                    )}
                  </>
                )}
                {isPremium && !active && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
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
        {/* Header */}
        <header className="bg-card border-b border-border h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search leads, listings..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Quick Add</span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-foreground truncate max-w-xs">
                  {user?.email?.split("@")[0] || "Agent"}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
