"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[80px]" />
      </div>
      <div className="relative z-10">
        <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-white font-bold text-lg">Clippy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-white/70 hover:text-white text-sm transition-colors">Sign in</Link>
            <Link href="/sign-up" className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition-all">Get started free</Link>
          </div>
        </nav>
        <section className="px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Your AI Co-Agent
            </span>
            <h1 className="mt-8 text-[clamp(2.5rem,6vw,5rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
              Clippy reads every lead,<br />
              <span className="text-emerald-400">drafts every reply,</span><br />
              and keeps every deal moving.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/55">
              You approve before anything leaves. Clippy proposes. You decide.
              That is the deal. 94% of follow-ups drafted. First response in under 5 minutes.
              Your pipeline working 24/7.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/sign-up" className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-8 text-[15px] font-semibold text-white hover:bg-emerald-400 transition-all active:scale-[0.98]">
                Start your free trial
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link href="/demo" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-8 text-[15px] font-medium text-white hover:border-white/40 transition-all">
                See a demo
              </Link>
            </div>
          </div>
        </section>
        <section className="px-6 py-16 border-t border-white/[0.06]">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-3 divide-x divide-white/[0.1] text-center">
              <div className="px-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Follow-ups drafted</span>
                <p className="mt-2 text-[2.5rem] font-light text-white sm:text-[3.5rem]">94%</p>
              </div>
              <div className="px-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">First response</span>
                <p className="mt-2 text-[2.5rem] font-light text-white sm:text-[3.5rem]">&lt; 5 min</p>
              </div>
              <div className="px-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Pipeline coverage</span>
                <p className="mt-2 text-[2.5rem] font-light text-white sm:text-[3.5rem]">24/7</p>
              </div>
            </div>
          </div>
        </section>
        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-[clamp(1.5rem,3vw,2.5rem)] font-light text-white">How Clippy works</h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              {[
                { step: "01", title: "Clippy reads your book", desc: "Connected to your CRM, listings, and inbox. Clippy learns your voice, your properties, and your leads." },
                { step: "02", title: "Clippy proposes actions", desc: "Drafts replies, schedules tours, updates your pipeline. Every action is proposed, never sent without you." },
                { step: "03", title: "You approve or adjust", desc: "One click to approve. Two clicks to edit. Zero clicks to let Clippy handle it on autopilot when you trust it." },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-500">{item.step}</span>
                  <h3 className="mt-4 text-[17px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/55">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="px-6 py-12 border-t border-white/[0.06]">
          <div className="mx-auto max-w-4xl text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Security & Compliance</span>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {["SOC 2", "ISO 27001", "GDPR", "AES-256", "Clerk Auth"].map((badge) => (
                <span key={badge} className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] text-white/60">{badge}</span>
              ))}
            </div>
          </div>
        </section>
        <section className="px-6 py-20 text-center">
          <h2 className="text-[clamp(1.5rem,3vw,2.5rem)] font-light text-white">Ready to close more deals?</h2>
          <p className="mx-auto mt-4 max-w-md text-[14px] text-white/55">Clippy goes live on your book in a day. No setup fees. Cancel anytime.</p>
          <Link href="/sign-up" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-8 text-[15px] font-semibold text-white hover:bg-emerald-400 transition-all active:scale-[0.98]">
            Start your free trial
          </Link>
        </section>
        <footer className="px-6 py-10 border-t border-white/[0.06]">
          <div className="mx-auto max-w-4xl flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white font-bold text-xs">C</div>
              <span className="text-white/40 text-xs">Clippy. Your AI Co-Agent.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/security" className="text-xs text-white/40 hover:text-white/70 transition-colors">Security</Link>
              <Link href="/privacy" className="text-xs text-white/40 hover:text-white/70 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-white/40 hover:text-white/70 transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
