"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageCircle, Calendar, CheckCircle, Zap, TrendingUp, Users, DollarSign, 
  Clock, Home, Brain, Sparkles, ArrowUpRight, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// Inline Card components
const Card = ({ className, children }: any) => (
  <div className={cn("rounded-2xl border-0 shadow-soft bg-white", className)}>{children}</div>
);
const CardContent = ({ className, children }: any) => (
  <div className={cn("p-6", className)}>{children}</div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    inspections: 0,
    hotLeads: 0,
    pipelineValue: 0,
    responseTime: 0,
    commissionGenerated: 0,
    timeSaved: 0,
  });

  useEffect(() => {
    fetch("/api/principal/dashboard")
      .then(r => r.json())
      .then(data => {
        setStats({
          conversations: data.conversations?.today || 0,
          inspections: data.inspections?.today || 0,
          hotLeads: data.hotLeads?.length || 0,
          pipelineValue: data.pipelineValue || 0,
          responseTime: data.responseTime || 27,
          commissionGenerated: data.commissionGenerated || 83000,
          timeSaved: data.timeSaved || 3.8,
        });
      })
      .catch(() => {});
  }, []);

  const messages = [
    "While you were having lunch, I:",
    "Good morning! Five buyers opened your email overnight.",
    "Congratulations! You booked three inspections while you slept.",
    "One lead hasn't replied in four days. I've prepared another follow-up.",
    "Great news! Two hot buyers are ready to make offers.",
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const timelineEvents = [
    { time: "09:01", event: "New REA enquiry", icon: MessageCircle, color: "text-blue-600", bg: "bg-pastel-blue" },
    { time: "09:02", event: "AI replied in 28 seconds", icon: Zap, color: "text-emerald-600", bg: "bg-pastel-mint" },
    { time: "09:05", event: "Buyer qualified - Budget 50k", icon: CheckCircle, color: "text-purple-600", bg: "bg-pastel-lavender" },
    { time: "09:06", event: "Inspection booked for Saturday 2pm", icon: Calendar, color: "text-orange-600", bg: "bg-pastel-peach" },
    { time: "09:08", event: "Reminder sent to buyer", icon: Clock, color: "text-pink-600", bg: "bg-pastel-pink" },
    { time: "09:12", event: "Lead moved to Hot Buyers", icon: TrendingUp, color: "text-emerald-600", bg: "bg-pastel-mint" },
  ];

  const metricCards = [
    {
      title: "Active Leads",
      value: stats.hotLeads,
      change: "+4 today",
      trend: "+27%",
      icon: Users,
      color: "bg-pastel-blue",
      iconColor: "text-blue-600",
      graph: [40, 65, 45, 80, 55, 90, 70],
    },
    {
      title: "Avg Response Time",
      value: stats.responseTime + "s",
      change: "Excellent",
      trend: "-65%",
      icon: Clock,
      color: "bg-pastel-mint",
      iconColor: "text-emerald-600",
      graph: [120, 95, 75, 60, 45, 30, 27],
    },
    {
      title: "Inspections Today",
      value: stats.inspections,
      change: "12 this week",
      trend: "+18%",
      icon: Home,
      color: "bg-pastel-lavender",
      iconColor: "text-purple-600",
      graph: [2, 3, 1, 4, 2, 5, 3],
    },
    {
      title: "Commission Generated",
      value: "$" + (stats.commissionGenerated / 1000).toFixed(0) + "k",
      change: "Potential",
      trend: "+23%",
      icon: DollarSign,
      color: "bg-pastel-peach",
      iconColor: "text-orange-600",
      graph: [45, 52, 68, 75, 82, 79, 83],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-pastel-mint/20">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* AI Daily Brief - THE Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pastel-lavender via-pastel-blue to-pastel-mint p-8 md:p-12 shadow-lg"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-white/40 rounded-full blur-sm"
                initial={{
                  x: Math.random() * 1200,
                  y: Math.random() * 400,
                }}
                animate={{
                  y: [0, -60, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <div className="flex items-start gap-6 mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-glow animate-float"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <div className="flex-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl md:text-4xl font-bold text-neutral-800 mb-2"
                >
                  👋 Good afternoon, Teddy
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg text-neutral-700"
                >
                  {randomMessage}
                </motion.p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { icon: MessageCircle, text: "Replied to enquiries", value: "14", color: "text-blue-600" },
                { icon: Calendar, text: "Booked inspections", value: "3", color: "text-purple-600" },
                { icon: CheckCircle, text: "Qualified buyers", value: "6", color: "text-emerald-600" },
                { icon: Zap, text: "Generated listings", value: "2", color: "text-orange-600" },
                { icon: Clock, text: "Follow-ups scheduled", value: "6", color: "text-pink-600" },
                { icon: DollarSign, text: "Commission potential", value: "3k", color: "text-emerald-600" },
              ].map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-center gap-4 p-5 bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft hover:shadow-md transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 rounded-xl bg-pastel-mint/50 flex items-center justify-center">
                    <action.icon className={cn("w-6 h-6", action.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-800">{action.value}</div>
                    <div className="text-sm text-neutral-600">{action.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-soft">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Time saved today</div>
                  <div className="text-2xl font-bold text-neutral-800">{stats.timeSaved} hours</div>
                </div>
              </div>
              <a
                href="/copilot"
                className="btn-premium bg-primary text-white px-8 py-4 rounded-2xl hover:shadow-glow hover:scale-105 transition-all text-lg font-semibold"
              >
                ✨ Ask Clippy Anything
              </a>
            </div>
          </div>
        </motion.div>

        {/* Metric Cards with Mini Graphs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className={cn("rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 hover:scale-105 overflow-hidden", card.color)}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <card.icon className={cn("w-6 h-6", card.iconColor)} />
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                      {card.trend}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-neutral-800 mb-1">{card.value}</div>
                  <div className="text-sm text-neutral-600 mb-4">{card.change}</div>
                  <div className="flex items-end gap-1 h-12">
                    {card.graph.map((value, j) => (
                      <div
                        key={j}
                        className="flex-1 bg-white/60 rounded-t-sm transition-all hover:bg-white"
                        style={{ height: (value / Math.max(...card.graph)) * 100 + "%" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Timeline */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl shadow-soft border-0 bg-white overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-pastel-lavender/30 to-pastel-blue/30">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-bold text-neutral-800">AI Activity Timeline</h2>
                </div>
                <p className="text-sm text-neutral-600 mt-1">Watch Clippy work in real-time</p>
              </div>
              <div className="p-6 space-y-4">
                {timelineEvents.map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-16 text-sm font-mono text-neutral-500 pt-1">
                      {event.time}
                    </div>
                    <div className="flex-shrink-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", event.bg)}>
                        <event.icon className={cn("w-5 h-5", event.color)} />
                      </div>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-neutral-50 hover:bg-pastel-blue/20 transition-colors">
                      <div className="font-medium text-neutral-800">{event.event}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="rounded-2xl shadow-soft border-0 bg-white">
            <div className="p-6 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800">Recent Conversations</h2>
              <p className="text-sm text-neutral-600 mt-1">Latest leads Clippy engaged</p>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 hover:bg-pastel-blue/20 transition-all hover:scale-102">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center">
                    <Users className="w-5 h-5 text-neutral-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-800">Buyer Enquiry #{i}</div>
                    <div className="text-sm text-neutral-600">Replied {i * 2} minutes ago</div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-neutral-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
