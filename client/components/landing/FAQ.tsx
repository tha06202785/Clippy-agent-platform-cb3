// ============================================================================
// FAQ Component
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

const faqs = [
  {
    question: "How does the AI lead qualification work?",
    answer: "Clippy uses advanced AI to chat with leads through your connected channels (Facebook, website, etc.). It asks qualifying questions based on your criteria, scores leads automatically, and prioritizes hot prospects. You get notified when someone is ready to buy or needs your personal attention."
  },
  {
    question: "Can I customize the AI responses?",
    answer: "Absolutely! You can customize Clippy's tone, responses, and qualifying questions. Set up custom scripts for different scenarios, train it on your brand voice, and even create different AI personas for different lead types."
  },
  {
    question: "What channels does Clippy integrate with?",
    answer: "Clippy integrates with Facebook Messenger, WhatsApp, your website chat widget, email, and SMS. We add new integrations regularly based on customer feedback."
  },
  {
    question: "Is my data secure?",
    answer: "Yes! We use bank-level encryption for all data. Your lead data is stored securely in Supabase with row-level security. We never share or sell your data, and we're GDPR compliant."
  },
  {
    question: "What happens when I hit my AI credit limit?",
    answer: "You'll receive a notification when you're approaching your limit. You can upgrade your plan anytime for more credits, or purchase additional credits as needed. Unused credits roll over for up to 30 days on Premium and Enterprise plans."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel anytime with no questions asked. If you cancel, you'll continue to have access until the end of your billing period. We also offer a 14-day free trial with no credit card required."
  },
  {
    question: "Do you offer team/brokerage plans?",
    answer: "Yes! Our Enterprise plan is designed for teams and brokerages. It includes unlimited users, team collaboration features, custom AI training, white-label options, and dedicated support. Contact our sales team for custom pricing."
  },
  {
    question: "How long does it take to set up?",
    answer: "Most agents are up and running in under 10 minutes. Connect your channels, set your qualifying criteria, and Clippy starts working immediately. The AI learns from your preferences over time to get even better."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
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
      id="faq"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div data-animate className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">FAQ</span>
          </div>
          
          <h2 
            data-animate 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            Frequently Asked{" "}
            <span className="text-gradient">Questions</span>
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              data-animate
              className="glass rounded-xl overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium pr-4">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`} 
                />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-4 text-white/60">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div 
          data-animate 
          className="text-center mt-12"
        >
          <p className="text-white/60 mb-4">Still have questions?</p>
          <a 
            href="mailto:support@clippy.com" 
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            Contact our support team
            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
          </a>
        </div>
      </div>
    </section>
  );
}
