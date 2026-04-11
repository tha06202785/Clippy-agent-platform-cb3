// ============================================================================
// Features Component
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { 
  Bot,
  MessageSquare,
  FileText,
  BarChart3,
  Share2,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Lead Qualification",
    description: "Clippy chats with leads 24/7, asks qualifying questions, and scores them so you focus on hot prospects only.",
    color: "purple",
    stat: "89%",
    statLabel: "Qualification Rate"
  },
  {
    icon: FileText,
    title: "Instant Listing Descriptions",
    description: "Generate stunning property descriptions in seconds. SEO-optimized, emotionally compelling, ready to publish.",
    color: "pink",
    stat: "3s",
    statLabel: "Average Generate Time"
  },
  {
    icon: MessageSquare,
    title: "Smart Follow-Ups",
    description: "Never lose a lead again. Automated, personalized follow-up sequences that feel human and convert.",
    color: "cyan",
    stat: "4x",
    statLabel: "Response Rate"
  },
  {
    icon: BarChart3,
    title: "Market Intelligence",
    description: "AI-powered pricing recommendations and market analysis. Know exactly how to position every listing.",
    color: "emerald",
    stat: "94%",
    statLabel: "Accuracy Rate"
  },
  {
    icon: Share2,
    title: "Social Media Automation",
    description: "Generate and schedule posts across all platforms. One click to create content that drives engagement.",
    color: "orange",
    stat: "10x",
    statLabel: "Time Saved"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "While you sleep, Clippy works. Answer inquiries, book viewings, and nurture leads around the clock.",
    color: "indigo",
    stat: "0",
    statLabel: "Missed Opportunities"
  }
];

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up");
            entry.target.classList.remove("opacity-0");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll("[data-animate]");
    elements?.forEach((el) => {
      el.classList.add("opacity-0");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const colorClasses: Record<string, string> = {
    purple: "from-purple-500 to-violet-600",
    pink: "from-pink-500 to-rose-600",
    cyan: "from-cyan-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    orange: "from-orange-500 to-amber-600",
    indigo: "from-indigo-500 to-purple-600",
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <div data-animate className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Powerful AI Features</span>
          </div>
          
          <h2 
            data-animate 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            Everything You Need to{" "}
            <span className="text-gradient">Close More Deals</span>
          </h2>
          
          <p 
            data-animate 
            className="text-lg text-white/60"
          >
            Clippy combines cutting-edge AI with real estate expertise to handle 
            the busywork while you focus on relationships.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              data-animate
              className={`group relative p-6 lg:p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 hover:border-white/20 cursor-pointer ${
                activeFeature === index ? "border-purple-500/50 bg-purple-500/[0.03]" : ""
              }`}
              onMouseEnter={() => setActiveFeature(index)}
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colorClasses[feature.color]} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              <div className="relative">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[feature.color]} p-0.5 mb-6`}>
                  <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-white/60 mb-6 group-hover:text-white/70 transition-colors">
                  {feature.description}
                </p>

                {/* Stat */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[feature.color]} bg-clip-text text-transparent`}>
                      {feature.stat}
                    </p>
                    <p className="text-sm text-white/40">{feature.statLabel}</p>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-white/60" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div 
          data-animate 
          className="text-center mt-16"
        >
          <p className="text-white/40 mb-4">And that&apos;s just the beginning...</p>
          <a 
            href="#pricing" 
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            See All Features
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
