"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Brain, MessageCircle, Calendar, CheckCircle, TrendingUp, Users, Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const features = [
    {
      icon: MessageCircle,
      title: "Replies to Every Lead",
      desc: "Clippy responds within 30 seconds, 24/7. Never lose another enquiry.",
      color: "bg-pastel-lavender",
    },
    {
      icon: Calendar,
      title: "Books Inspections",
      desc: "Automatically schedules and confirms property inspections.",
      color: "bg-pastel-mint",
    },
    {
      icon: Brain,
      title: "Learns Your Business",
      desc: "Knows your listings, agency, and style. Gets smarter every day.",
      color: "bg-pastel-blue",
    },
    {
      icon: Zap,
      title: "Works While You Sleep",
      desc: "Follows up, nurtures leads, and keeps deals moving overnight.",
      color: "bg-pastel-yellow",
    },
    {
      icon: CheckCircle,
      title: "Never Makes Mistakes",
      desc: "Compliance-checked responses. Australian real estate expert.",
      color: "bg-pastel-pink",
    },
    {
      icon: TrendingUp,
      title: "Saves 20+ Hours/Week",
      desc: "Agents reclaim their time for what matters: closing deals.",
      color: "bg-pastel-peach",
    },
  ];

  const stats = [
    { value: "14", label: "Replies in 30s", suffix: "x faster" },
    { value: "3.8", label: "Hours Saved", suffix: "per agent/day" },
    { value: "18", label: "Inspections", suffix: "booked automatically" },
    { value: "42", label: "Leads Qualified", suffix: "this week" },
  ];

  const testimonials = [
    {
      quote: "Clippy replied to 47 enquiries while I was at my kid's soccer game. This is the future.",
      author: "Sarah Chen",
      role: "Principal, Ray White Surfers",
      avatar: "👩‍💼",
    },
    {
      quote: "I was skeptical about AI. Now I can't imagine running my agency without it.",
      author: "Michael Torres",
      role: "Director, McGrath Estate Agents",
      avatar: "👨‍💼",
    },
    {
      quote: "My team loves it. We're closing more deals because we're actually talking to humans, not typing emails.",
      author: "Emma Richardson",
      role: "Sales Manager, Harcourts",
      avatar: "👩‍🏢",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Floating Particles Background */}
      {mounted && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary/20 rounded-full blur-sm"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-800">Clippy</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/sign-in" className="text-neutral-800 hover:text-primary transition-colors">Sign In</Link>
            <Link
              href="/signup"
              className="btn-premium bg-primary text-white px-5 py-2.5 hover:shadow-glow"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-pastel-mint border border-emerald-200 rounded-full px-4 py-2 mb-8"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">Your AI Co-Agent for Real Estate</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-neutral-800 leading-tight mb-8">
              Clippy reads every lead,
              <br />
              <span className="text-gradient">drafts every reply,</span>
              <br />
              and keeps every deal moving.
            </h1>

            <p className="text-xl md:text-2xl text-neutral-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Your 24/7 AI assistant that responds to enquiries in 30 seconds,
              books inspections, and nurtures leads while you focus on closing deals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="btn-premium bg-primary text-white px-8 py-4 text-lg hover:shadow-glow hover:scale-105"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="#demo"
                className="btn-premium bg-white text-neutral-800 border-2 border-neutral-200 px-8 py-4 text-lg hover:border-primary hover:text-primary"
              >
                Watch Demo
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Australian Real Estate Expert</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Trusted by 500+ Agents</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                  <span className="text-2xl text-neutral-400 ml-1">{stat.suffix}</span>
                </div>
                <div className="text-neutral-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* "This Is Your New Employee" Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-neutral-800 mb-6">
              This is your new employee.
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Clippy isn't just software. It's an AI co-agent that works 24/7,
              never takes a sick day, and gets smarter every single day.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="card-glass p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-800">Good afternoon, Teddy.</h3>
                  <p className="text-neutral-600">Here's what I did while you were away:</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { icon: MessageCircle, text: "Replied to 14 enquiries", color: "text-emerald-600" },
                  { icon: CheckCircle, text: "Qualified 6 buyers", color: "text-blue-600" },
                  { icon: Calendar, text: "Booked 3 inspections", color: "text-purple-600" },
                  { icon: Zap, text: "Generated 2 listing captions", color: "text-orange-600" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 p-4 bg-pastel-mint/50 rounded-xl"
                  >
                    <item.icon className={item.color} />
                    <span className="text-neutral-800 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-200">
                <div className="text-center text-neutral-500 mb-4">
                  Total time saved today: <span className="text-primary font-bold">3.8 hours</span>
                </div>
                <Link
                  href="/dashboard"
                  className="btn-premium bg-primary text-white px-6 py-3 w-full hover:shadow-glow"
                >
                  Ask Clippy Anything
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-neutral-800 mb-6">
              Everything your agency needs.
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Clippy handles the repetitive work so you can focus on what matters.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={feature.color + " rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:scale-105"}
              >
                <feature.icon className="w-12 h-12 text-neutral-800/60 mb-4" />
                <h3 className="text-xl font-bold text-neutral-800 mb-2">{feature.title}</h3>
                <p className="text-neutral-700 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-gradient-ai">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-neutral-800 mb-6">
              Loved by top agents.
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              See what real estate professionals are saying about Clippy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300"
              >
                <div className="text-6xl mb-4">{testimonial.avatar}</div>
                <p className="text-lg text-neutral-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-bold text-neutral-800">{testimonial.author}</div>
                  <div className="text-neutral-600 text-sm">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-neutral-800 mb-6">
              Ready to meet your new co-agent?
            </h2>
            <p className="text-xl text-neutral-600 mb-12">
              Join 500+ Australian real estate agents using Clippy today.
            </p>
            <Link
              href="/signup"
              className="btn-premium bg-primary text-white px-10 py-5 text-xl hover:shadow-glow hover:scale-105 inline-flex items-center gap-3"
            >
              Start Your Free Trial
              <ArrowRight className="w-6 h-6" />
            </Link>
            <p className="mt-6 text-neutral-500 text-sm">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-neutral-800">Clippy</span>
          </div>
          <div className="text-neutral-500 text-sm">
            © 2026 Clippy. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-600">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-primary transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
