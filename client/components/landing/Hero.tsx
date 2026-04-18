// ============================================================================
// Hero Component
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import DemoVideoModal from "./DemoVideoModal";
import { 
  ArrowRight, 
  Play, 
  Bot,
  MessageSquare,
  TrendingUp,
  Users,
  Sparkles,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = heroRef.current?.querySelectorAll("[data-animate]");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
            <div data-animate className="opacity-0" style={{ animationDelay: "0.1s" }}>
              <Badge variant="gradient" className="mx-auto lg:mx-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Trusted by 10,000+ agents worldwide
              </Badge>
            </div>

            {/* Headline */}
            <div data-animate className="opacity-0" style={{ animationDelay: "0.2s" }}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Close More Deals{" "}
                <span className="text-gradient">With AI That Works</span>{" "}
                While You Sleep
              </h1>
            </div>

            {/* Subheadline */}
            <p 
              data-animate 
              className="opacity-0 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto lg:mx-0"
              style={{ animationDelay: "0.3s" }}
            >
              Clippy generates stunning property listings, qualifies leads 24/7, 
              and follows up automatically. Your AI assistant that never sleeps.
            </p>

            {/* CTA Buttons */}
            <div 
              data-animate 
              className="opacity-0 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              style={{ animationDelay: "0.4s" }}
            >
              <Button variant="primary" size="lg" className="group" onClick={() => navigate("/signup")}>
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="group"
                onClick={() => setIsDemoOpen(true)}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div 
              data-animate 
              className="opacity-0 pt-8 border-t border-white/10"
              style={{ animationDelay: "0.5s" }}
            >
              <p className="text-sm text-white/40 mb-4">Trusted by agents at</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-white/30 font-semibold">
                <span>RE/MAX</span>
                <span>Keller Williams</span>
                <span>Century 21</span>
                <span>Sotheby's</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div 
            data-animate 
            className="opacity-0 relative lg:pl-8"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full" />
              
              {/* Main Dashboard Card */}
              <div className="relative glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-white/40">Clippy Dashboard</span>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">+127%</span>
                      </div>
                      <p className="text-lg font-bold">248</p>
                      <p className="text-xs text-white/40">New Leads</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs">AI Active</span>
                      </div>
                      <p className="text-lg font-bold">1,432</p>
                      <p className="text-xs text-white/40">Messages</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-pink-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">+23%</span>
                      </div>
                      <p className="text-lg font-bold">89%</p>
                      <p className="text-xs text-white/40">Conversion</p>
                    </div>
                  </div>
                  
                  {/* Chat Preview */}
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-white/10 rounded-lg rounded-tl-none p-3">
                          <p className="text-sm">Hi Sarah! I noticed you viewed 123 Market St. Would you like to schedule a viewing this weekend? 🏠</p>
                        </div>
                        <span className="text-xs text-white/30 mt-1">Clippy AI • Just now</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">SJ</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-purple-500/20 rounded-lg rounded-tr-none p-3">
                          <p className="text-sm">Yes please! Saturday morning works for me.</p>
                        </div>
                        <span className="text-xs text-white/30 mt-1 block text-right">Sarah J. • Just now</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      Generate Listing
                    </button>
                    <button className="flex-1 py-2 px-3 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4 text-pink-400" />
                      Follow Up
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 glass rounded-xl p-3 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">New Lead!</p>
                    <p className="text-[10px] text-white/40">Facebook Messenger</p>
                  </div>
                </div>
              </div>
              
              <div 
                className="absolute -bottom-4 -left-4 glass rounded-xl p-3 animate-float"
                style={{ animationDelay: "1s" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">AI Generated!</p>
                    <p className="text-[10px] text-white/40">Listing Description</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Video Modal */}
      <DemoVideoModal 
        isOpen={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
      />
    </section>
  );
}
