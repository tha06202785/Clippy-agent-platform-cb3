"use client";
import { useState } from "react";
import Link from "next/link";
import { Building2, User, ChevronRight, Sparkles, Check, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [step, setStep] = useState<"choose" | "individual" | "enterprise">("choose");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [agentCount, setAgentCount] = useState("");

  if (step === "choose") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">C</div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to Clippy</h1>
            <p className="text-muted-foreground mt-2">Tell us about yourself so we can set up the right experience.</p>
          </div>
          <div className="grid gap-4">
            <button onClick={() => setStep("individual")}
              className="group text-left p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground text-lg">I am an individual agent</h2>
                  <p className="text-sm text-muted-foreground mt-1">Solo agent working on my own. I need a co-agent to help me manage leads, follow-ups, and deals.</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-muted-foreground">Starts at 9/month</span>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">14-day free trial</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
              </div>
            </button>
            <button onClick={() => setStep("enterprise")}
              className="group text-left p-6 rounded-xl border-2 border-primary/20 bg-primary/[0.02] hover:border-primary/50 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground text-lg">I represent a brokerage or team</h2>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Enterprise</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Multi-agent office or brokerage. I need compliance monitoring, team management, and executive reporting.</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-muted-foreground">Starts at 49/month</span>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">14-day free trial</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
              </div>
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Already have an account? <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (step === "individual") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Create your individual account</h1>
            <p className="text-sm text-muted-foreground mt-2">Start your 14-day free trial. No credit card required.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Johnson" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@example.com" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <input type="password" placeholder="At least 8 characters" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Free for 14 days, then 9/month. Cancel anytime.</p>
            </div>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">Create account</button>
            <p className="text-xs text-center text-muted-foreground">By signing up, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "enterprise") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Set up your brokerage</h1>
            <p className="text-sm text-muted-foreground mt-2">Start your 14-day free trial. No credit card required.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Work email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@brokerage.com" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Brokerage / office name</label>
              <input type="text" value={officeName} onChange={e => setOfficeName(e.target.value)} placeholder="Premier Realty Group" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Number of agents</label>
              <select value={agentCount} onChange={e => setAgentCount(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select...</option>
                <option value="2-5">2-5 agents</option>
                <option value="6-10">6-10 agents</option>
                <option value="11-25">11-25 agents</option>
                <option value="26-50">26-50 agents</option>
                <option value="51-100">51-100 agents</option>
                <option value="100+">100+ agents</option>
              </select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Free for 14 days, then from 49/month. Includes compliance monitoring, team management, and executive reporting.</p>
            </div>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">Create account</button>
            <p className="text-xs text-center text-muted-foreground">By signing up, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      </div>
    );
  }
}
