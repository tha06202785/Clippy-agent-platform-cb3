import Link from "next/link";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <div className="text-6xl mb-6">🏠</div>
        <h1 className="text-4xl font-bold text-white mb-4">See Clippy in Action</h1>
        <p className="text-slate-300 text-lg mb-8">
          Watch how Clippy reads every lead, drafts replies, and keeps your deals moving — 24/7.
        </p>
        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-full transition-all"
          >
            Start Free Trial
          </Link>
          <Link
            href="/pricing"
            className="block w-full border border-slate-600 hover:border-slate-400 text-slate-300 font-medium py-3 px-6 rounded-full transition-all"
          >
            View Pricing
          </Link>
        </div>
        <p className="text-slate-500 text-sm mt-6">No credit card required • 14-day free trial</p>
      </div>
    </div>
  );
}
