"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Calendar, CheckCircle, Zap, TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    inspections: 0,
    hotLeads: 0,
    pipelineValue: 0,
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
        });
      })
      .catch(() => {});
  }, []);

  const metricCards = [
    {
      title: "Conversations Today",
      value: stats.conversations,
      change: "+23%",
      icon: MessageCircle,
      color: "bg-pastel-blue",
      iconColor: "text-blue-600",
    },
    {
      title: "Inspections Booked",
      value: stats.inspections,
      change: "+18%",
      icon: Calendar,
      color: "bg-pastel-mint",
      iconColor: "text-emerald-600",
    },
    {
      title: "Hot Leads",
      value: stats.hotLeads,
      change: "+12%",
      icon: CheckCircle,
      color: "bg-pastel-lavender",
      iconColor: "text-purple-600",
    },
    {
      title: "Pipeline Value",
      value: "$" + (stats.pipelineValue / 1000000).toFixed(1) + "M",
      change: "+8.2%",
      icon: DollarSign,
      color: "bg-pastel-peach",
      iconColor: "text-orange-600",
    },
  ];

  const aiActions = [
    { icon: MessageCircle, text: "Replied to 14 enquiries", color: "text-emerald-600" },
    { icon: CheckCircle, text: "Qualified 6 buyers", color: "text-blue-600" },
    { icon: Calendar, text: "Booked 3 inspections", color: "text-purple-600" },
    { icon: Zap, text: "Generated 2 listing captions", color: "text-orange-600" },
  ];

  return (
    <div className="space-y-8">
      {/* AI Briefing Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">Good afternoon, Teddy</h2>
            <p className="text-neutral-600">Here's what Clippy did while you were away:</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {aiActions.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-4 bg-pastel-mint/50 rounded-xl"
            >
              <action.icon className={cn("w-6 h-6", action.color)} />
              <span className="text-neutral-800 font-medium">{action.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-neutral-600">
            Total time saved today: <span className="text-primary font-bold">3.8 hours</span>
          </div>
          <a href="/copilot" className="btn-premium bg-primary text-white px-6 py-3 hover:shadow-glow">
            Ask Clippy Anything
          </a>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={cn("rounded-2xl border-0 shadow-soft hover:shadow-md transition-all duration-300 hover:scale-105", card.color)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-800">{card.title}</CardTitle>
                <card.icon className={cn("w-5 h-5", card.iconColor)} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-800">{card.value}</div>
                <p className="text-xs text-neutral-600 mt-1">
                  <span className="text-emerald-600 font-semibold">{card.change}</span> from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-soft border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-800">Recent Conversations</CardTitle>
            <CardDescription>Latest leads Clippy has engaged with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 hover:bg-pastel-blue/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center">
                    <Users className="w-5 h-5 text-neutral-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-800">Lead Enquiry #{i}</div>
                    <div className="text-sm text-neutral-600">Replied 2 minutes ago</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-800">Upcoming Inspections</CardTitle>
            <CardDescription>Scheduled for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 hover:bg-pastel-mint/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-pastel-lavender flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-800">Property Inspection #{i}</div>
                    <div className="text-sm text-neutral-600">Tomorrow at 2:00 PM</div>
                  </div>
                  <Clock className="w-5 h-5 text-neutral-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
