// ============================================================================
// Pricing Component
// ============================================================================

import { useEffect, useRef } from "react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Free",
    description: "Get started with basic AI assistance",
    price: { monthly: 0, yearly: 0 },
    icon: Sparkles,
    features: [
      "100 AI credits/month",
      "5 property listings",
      "100 leads",
      "Basic AI chat",
      "Email support",
      "Standard analytics"
    ],
    cta: "Get Started Free",
    popular: false,
    color: "from-white/20 to-white/10"
  },
  {
    name: "Premium",
    description: "Unlock full AI power for serious agents",
    price: { monthly: 49, yearly: 490 },
    icon: Zap,
    features: [
      "1,000 AI credits/month",
      "50 property listings",
      "1,000 leads",
      "Advanced AI chat",
      "Lead scoring & analysis",
      "Market intelligence",
      "Social media automation",
      "Priority support",
      "Advanced analytics"
    ],
    cta: "Start Free Trial",
    popular: true,
    color: "from-purple-500 to-pink-500"
  },
  {
    name: "Enterprise",
    description: "For teams and brokerages",
    price: { monthly: 199, yearly: 1990 },
    icon: Crown,
    features: [
      "5,000 AI credits/month",
      "Unlimited listings",
      "Unlimited leads",
      "White-label option",
      "Team collaboration",
      "Custom AI training",
      "Dedicated account manager",
      "SLA guarantee",
      "API access"
    ],
    cta: "Contact Sales",
    popular: false,
    color: "from-amber-500 to-orange-500"
  }
];

export default function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div data-animate className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-pink-300">Simple Pricing</span>
          </div>
          
          <h2 
            data-animate 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            Choose Your{" "}
            <span className="text-gradient">Growth Plan</span>
          </h2>
          
          <p 
            data-animate 
            className="text-lg text-white/60"
          >
            Start free, scale as you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              data-animate
              className={`relative group rounded-2xl border ${
                plan.popular
                  ? "border-purple-500/50 bg-purple-500/[0.03]"
                  : "border-white/10 bg-white/[0.02]"
              } hover:border-white/30 transition-all duration-500 overflow-hidden`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 p-4">
                  <Badge variant="gradient">Most Popular</Badge>
                </div>
              )}

              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              <div className="relative p-6 lg:p-8">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} p-0.5 mb-6`}>
                  <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${plan.price.monthly}
                    </span>
                    <span className="text-white/40">/month</span>
                  </div>
                  {plan.price.yearly > 0 && (
                    <p className="text-sm text-white/40 mt-1">
                      or ${plan.price.yearly}/year (save {Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)}%)
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className="w-full mb-8"
                  onClick={() => plan.name === "Enterprise" ? window.location.href = "mailto:sales@clippy.com" : navigate("/signup")}
                >
                  {plan.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div 
          data-animate 
          className="text-center mt-16 space-y-4"
        >
          <div className="flex flex-wrap justify-center gap-6 text-white/30">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">14-day free trial</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
