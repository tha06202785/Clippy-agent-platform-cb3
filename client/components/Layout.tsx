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
  Wand2,
  Users,
  MessageSquare,
  PlugIcon,
  Activity,
  Home,
  Bot,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

// Navigation categories with sub-items
const NAV_CATEGORIES = [
  {
    id: "core",
    label: "Core",
    icon: Home,
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/inbox", label: "Lead Inbox", icon: Inbox },
      { path: "/listings", label: "Listings", icon: FileText },
      { path: "/planner", label: "Planner", icon: Calendar },
    ],
  },
  {
    id: "ai",
    label: "AI Tools",
    icon: Bot,
    items: [
      { path: "/ai-radar", label: "AI Radar", icon: Radar, premium: true },
      { path: "/ai-inbox", label: "AI Inbox", icon: Sparkles, premium: true },
      { path: "/content", label: "Content Generator", icon: Wand2 },
      { path: "/voice", label: "Voice Settings", icon: MessageSquare },
      { path: "/automation", label: "Automation", icon: Activity },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    icon: PlugIcon,
    items: [
      { path: "/onboarding", label: "Onboarding", icon: Users },
      { path: "/integrations", label: "Integrations", icon: PlugIcon },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Monitor,
    items: [
      { path: "/logs", label: "Activity Logs", icon: Activity },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Layout({ children, showNav = true }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["core", "ai"]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col hidden lg:flex`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between h-16">
          {sidebarOpen ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">
                Clippy
              </span>
            </Link>
          ) : (
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
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {NAV_CATEGORIES.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories.includes(category.id);
            const hasActiveItem = category.items.some((item) => isActive(item.path));

            return (
              <div key={category.id} className="mb-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    hasActiveItem
                      ? "bg-sidebar-primary/20 text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <CategoryIcon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="font-semibold text-sm flex-1 text-left">
                        {category.label}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && sidebarOpen && (
                  <div className="mt-1 ml-2 pl-2 border-l-2 border-sidebar-accent/50 space-y-0.5">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.premium && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">
                              AI
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full ${
              sidebarOpen ? "" : "justify-center"
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search leads, listings..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-sidebar border-b border-sidebar-border px-3 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {NAV_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 className="text-xs font-bold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
                  {category.label}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <ItemIcon className="w-5 h-5" />
                        <span>{item.label}</span>
                        {item.premium && (
                          <span className="ml-auto text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                            AI
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
