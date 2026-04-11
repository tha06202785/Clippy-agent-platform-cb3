// ============================================================================
// HowItWorks Component
// ============================================================================

import { useEffect, useRef } from "react";
import { Bot, Users, Rocket, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Bot,
    title: "Connect Your Channels",
    description: "Link Facebook, your website, and other lead sources. Clippy monitors everything 24/7.",
    color: "purple"
  },
  {
    icon: Users,
    title: "AI Qualifies Leads",
    description: "Clippy automatically chats with leads, asks qualifying questions, and scores them for you.",
    color: "pink"
  },
  {
    icon: Sparkles,
    title: "Generate Content",
    description: "Create stunning listings, social posts, and follow-ups in seconds with AI assistance.",
    color: "cyan"
  },
  {
    icon: Rocket,
    title: "Close More Deals",
    description: "Focus on hot prospects while Clippy nurtures the rest. Watch your conversion rate soar.",
    color: "emerald"
  }
];

export default function HowItWorks() {
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
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
  };

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <div data-animate className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300">Simple Setup</span>
          </div>
          
          <h2 
            data-animate 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            Get Started in{" "}
            <span className="text-gradient">4 Easy Steps</span>
          </h2>
          
          <p 
            data-animate 
            className="text-lg text-white/60"
          >
            No complex setup. No training required. Connect your channels and let Clippy do the rest.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-emerald-500 hidden lg:block" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                data-animate
                className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Step number/icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-16 h-16 rounded-2xl ${colorClasses[step.color]} flex items-center justify-center shadow-lg`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 glass rounded-2xl p-6 lg:p-8">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-white/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
