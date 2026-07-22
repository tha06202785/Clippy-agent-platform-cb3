"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageCircle, Calendar, CheckCircle, Zap, TrendingUp, Users, DollarSign, 
  Clock, Home, Brain, Sparkles, ArrowUpRight, Activity, AlertCircle, 
  Star, ChevronRight, Check, X, Bell, Phone, Mail, Send
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    inspections: 0,
    hotLeads: 0,
    pipelineValue: 0,
    responseTime: 0,
    commissionGenerated: 0,
    timeSaved: 0,
    repliesToday: 0,
    repliesYesterday: 0,
  });

  const [priorities, setPriorities] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("Good morning");
  const [agentName, setAgentName] = useState("Sarah");

  useEffect(() => {
    // Dynamic greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetch("/api/principal/dashboard")
      .then(r => r.json())
      .then(data => {
        setStats({
          conversations: data.conversations?.today || 0,
          inspections: data.inspections?.today || 0,
          hotLeads: data.hotLeads?.length || 0,
          pipelineValue: data.pipelineValue || 0,
          responseTime: data.responseTime || 27,
          commissionGenerated: data.commissionGenerated || 126000,
          timeSaved: data.timeSaved || 3.7,
          repliesToday: data.repliesToday || 14,
          repliesYesterday: data.repliesYesterday || 11,
        });
        
        // Mock priorities - would come from API
        setPriorities([
          {
            id: 1,
            urgency: "red",
            title: "Buyer is ready to make an offer",
            confidence: 87,
            action: "Call before 2 PM",
            icon: Star,
            leadName: "Sarah Chen",
          },
          {
            id: 2,
            urgency: "orange",
            title: "Vendor opened your proposal 5 times",
            confidence: 94,
            action: "Recommend follow-up",
            icon: Activity,
            leadName: "Michael Torres",
          },
          {
            id: 3,
            urgency: "green",
            title: "Inspection confirmation pending",
            confidence: 96,
            action: "One click to approve",
            icon: Calendar,
            leadName: "Emma Richardson",
          },
        ]);

        // Mock recommendations
        setRecommendations([
          {
            id: 1,
            title: "Sarah opened your email six times",
            why: "High engagement indicates strong interest",
            action: "Recommend calling today",
            confidence: 94,
            icon: Phone,
          },
          {
            id: 2,
            title: "Three buyers match 25 Collins Street",
            why: "All searched in same price range last week",
            action: "Generate shortlist?",
            confidence: 89,
            icon: Home,
          },
          {
            id: 3,
            title: "Inspection attendance predicted 96%",
            why: "Based on past behavior and response time",
            action: "Send reminder?",
            confidence: 96,
            icon: Bell,
          },
        ]);
      })
      .catch(() => {});
  }, []);

  const timelineEvents = [
    { time: "09:01", event: "REA enquiry received", icon: MessageCircle, color: "text-blue-600", bg: "bg-pastel-blue" },
    { time: "09:02", event: "Clippy replied in 28 seconds", icon: Zap, color: "text-emerald-600", bg: "bg-pastel-mint" },
    { time: "09:04", event: "Buyer qualified - Budget 50k", icon: CheckCircle, color: "text-purple-600", bg: "bg-pastel-lavender" },
    { time: "09:06", event: "Inspection booked for Saturday 2pm", icon: Calendar, color: "text-orange-600", bg: "bg-pastel-peach" },
    { time: "09:08", event: "Reminder sent to buyer", icon: Bell, color: "text-pink-600", bg: "bg-pastel-pink" },
    { time: "09:10", event: "Lead moved to Hot Buyers", icon: TrendingUp, color: "text-emerald-600", bg: "bg-pastel-mint" },
  ];

  const replyChange = stats.repliesYesterday > 0 
    ? Math.round(((stats.repliesToday - stats.repliesYesterday) / stats.repliesYesterday) * 100)
    : 0;

  const metricCards = [
    {
      title: "Replies Today",
      value: stats.repliesToday,
      change: replyChange > 0 ? "▲ " + replyChange + "%" : replyChange < 0 ? "▼ " + Math.abs(replyChange) + "%" : "No change",
      context: "vs Yesterday",
      icon: MessageCircle,
      color: "bg-pastel-blue",
      iconColor: "text-blue-600",
    },
    {
      title: "Avg Response Time",
      value: stats.responseTime + "s",
      change: "Excellent",
      context: "Industry avg: 2.4h",
      icon: Clock,
      color: "bg-pastel-mint",
      iconColor: "text-emerald-600",
    },
    {
      title: "Inspections Today",
      value: stats.inspections || "—",
      change: stats.inspections > 0 ? stats.inspections + " this week" : "No urgent tasks",
      context: stats.inspections > 0 ? "" : "Enjoy your coffee ☕",
      icon: Home,
      color: "bg-pastel-lavender",
      iconColor: "text-purple-600",
    },
    {
      title: "Estimated Commission",
      value: "$" + (stats.commissionGenerated / 1000).toFixed(0) + "k",
      change: "Potential",
      context: "Based on active leads",
      icon: DollarSign,
      color: "bg-pastel-peach",
      iconColor: "text-orange-600",
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "red": return "bg-red-50 border-red-200 hover:border-red-300";
      case "orange": return "bg-orange-50 border-orange-200 hover:border-orange-300";
      case "green": return "bg-emerald-50 border-emerald-200 hover:border-emerald-300";
      default: return "bg-neutral-50 border-neutral-200 hover:border-neutral-300";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "red": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "orange": return <Bell className="w-5 h-5 text-orange-600" />;
      case "green": return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default: return <AlertCircle className="w-5 h-5 text-neutral-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-pastel-mint/20">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        
        {/* AI Greeting Card - Reduced height by 30% */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pastel-lavender via-pastel-blue to-pastel-mint p-6 md:p-8 shadow-lg"
        >
          <div className="flex items-start gap-4 mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-glow"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl md:text-3xl font-bold text-neutral-800 mb-1"
              >
                👋 {greeting}, {agentName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-base text-neutral-700"
              >
                While you were away I:
              </motion.p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {[
              { icon: MessageCircle, text: "Replied to enquiries", value: "14", color: "text-blue-600" },
              { icon: Calendar, text: "Booked inspections", value: "3", color: "text-purple-600" },
              { icon: CheckCircle, text: "Qualified buyers", value: "6", color: "text-emerald-600" },
              { icon: Home, text: "Generated listings", value: "2", color: "text-orange-600" },
              { icon: Clock, text: "Follow-ups scheduled", value: "5", color: "text-pink-600" },
              { icon: DollarSign, text: "Commission pipeline", value: "26k", color: "text-emerald-600" },
            ].map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-3 p-3 bg-white/70 backdrop-blur-sm rounded-xl shadow-soft hover:shadow-md transition-all hover:scale-102"
              >
                <div className="w-10 h-10 rounded-lg bg-pastel-mint/50 flex items-center justify-center flex-shrink-0">
                  <action.icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-neutral-800">{action.value}</div>
                  <div className="text-xs text-neutral-600 truncate">{action.text}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur flex items-center justify-center shadow-soft">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xs text-neutral-600">Time saved today</div>
                <div className="text-lg font-bold text-neutral-800">{stats.timeSaved} hours</div>
              </div>
            </div>
            <a
              href="/copilot"
              className="btn-premium bg-primary text-white px-6 py-3 rounded-xl hover:shadow-glow hover:scale-105 transition-all text-base font-semibold"
            >
              ✨ Ask Clippy Anything
            </a>
          </div>
        </motion.div>

        {/* Today's Priorities - HIGHEST PRIORITY SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-neutral-800">Today's Priorities</h2>
            <span className="text-sm text-neutral-500 ml-auto">3 urgent items</span>
          </div>
          
          <div className="space-y-3">
            {priorities.map((priority, i) => (
              <motion.div
                key={priority.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={cn(
                  "rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-md hover:scale-101 cursor-pointer",
                  getUrgencyColor(priority.urgency)
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getUrgencyIcon(priority.urgency)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-neutral-800 mb-1">{priority.title}</h3>
                        <p className="text-sm text-neutral-600">{priority.leadName}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full",
                          priority.urgency === "red" ? "bg-red-100 text-red-700" :
                          priority.urgency === "orange" ? "bg-orange-100 text-orange-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {priority.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button className="btn-premium bg-primary text-white px-4 py-2 rounded-lg text-sm hover:shadow-glow">
                        {priority.action}
                      </button>
                      <button className="btn-premium bg-white text-neutral-700 border border-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-50">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-neutral-800">Today's AI Suggestions</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="rounded-xl border-2 border-neutral-200 p-5 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pastel-lavender/50 flex items-center justify-center flex-shrink-0">
                    <rec.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-800 text-sm">{rec.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 mb-3">{rec.why}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                    {rec.confidence}% confidence
                  </span>
                  <button className="text-xs font-semibold text-primary hover:underline">
                    {rec.action}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className={cn("rounded-xl p-5 shadow-soft hover:shadow-md transition-all duration-300 hover:scale-102", card.color)}>
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={cn("w-5 h-5", card.iconColor)} />
                </div>
                <div className="text-2xl font-bold text-neutral-800 mb-1">{card.value}</div>
                <div className="text-sm text-neutral-700 font-medium">{card.title}</div>
                {card.change && (
                  <div className="text-xs text-neutral-600 mt-1">
                    <span className={card.change.includes("▲") ? "text-emerald-600 font-semibold" : ""}>{card.change}</span>
                    {card.context && <span className="ml-1">{card.context}</span>}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Timeline */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl shadow-soft border-0 bg-white overflow-hidden">
              <div className="p-5 border-b border-neutral-100 bg-gradient-to-r from-pastel-lavender/30 to-pastel-blue/30">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-neutral-800">AI Activity Timeline</h2>
                </div>
                <p className="text-xs text-neutral-600 mt-1">Watch Clippy work in real-time</p>
              </div>
              <div className="p-5 space-y-3">
                {timelineEvents.map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-14 text-xs font-mono text-neutral-500 pt-1">
                      {event.time}
                    </div>
                    <div className="flex-shrink-0">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", event.bg)}>
                        <event.icon className={cn("w-4 h-4", event.color)} />
                      </div>
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-neutral-50 hover:bg-pastel-blue/20 transition-colors">
                      <div className="text-sm font-medium text-neutral-800">{event.event}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="rounded-2xl shadow-soft border-0 bg-white">
            <div className="p-5 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-800">Recent Conversations</h2>
              <p className="text-xs text-neutral-600 mt-1">Latest leads Clippy engaged</p>
            </div>
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 hover:bg-pastel-blue/20 transition-all hover:scale-101">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-neutral-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800 text-sm">Buyer Enquiry #{i}</div>
                    <div className="text-xs text-neutral-600">Replied {i * 2}m ago</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
