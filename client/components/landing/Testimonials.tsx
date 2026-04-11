// ============================================================================
// Testimonials Component
// ============================================================================

import { useEffect, useRef } from "react";
import { Star, Quote, Sparkles } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Top Producer, Keller Williams",
    image: "SC",
    quote: "Clippy has completely transformed how I handle leads. I've doubled my conversion rate in just 3 months. The AI is incredibly human-like.",
    rating: 5,
    metric: "2x",
    metricLabel: "Conversion Rate"
  },
  {
    name: "Marcus Johnson",
    role: "Broker, Century 21",
    image: "MJ",
    quote: "As a broker managing 20 agents, Clippy helps us ensure no lead falls through the cracks. Our team productivity has increased by 40%.",
    rating: 5,
    metric: "40%",
    metricLabel: "Productivity Boost"
  },
  {
    name: "Emily Rodriguez",
    role: "Agent, RE/MAX",
    image: "ER",
    quote: "The AI-generated listings are incredible. What used to take me an hour now takes 30 seconds. And they're actually better than what I wrote myself!",
    rating: 5,
    metric: "10x",
    metricLabel: "Time Saved"
  },
  {
    name: "David Kim",
    role: "Agent, Sotheby's",
    image: "DK",
    quote: "My clients think I'm super responsive because Clippy answers their questions instantly, even at 2 AM. It's like having a 24/7 assistant.",
    rating: 5,
    metric: "24/7",
    metricLabel: "Availability"
  }
];

export default function Testimonials() {
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

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div data-animate className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Loved by Agents</span>
          </div>
          
          <h2 
            data-animate 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            What{" "}
            <span className="text-gradient">10,000+ Agents</span>{" "}
            Say About Clippy
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              data-animate
              className="group relative glass rounded-2xl p-6 lg:p-8 hover:bg-white/[0.05] transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote icon */}
              <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-12 h-12" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-white/80 mb-6 relative z-10">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-white/50">{testimonial.role}</p>
                  </div>
                </div>

                {/* Metric */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gradient">{testimonial.metric}</p>
                  <p className="text-xs text-white/40">{testimonial.metricLabel}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
