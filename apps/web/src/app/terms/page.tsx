import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">&larr; Back to home</Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>Last updated: July 2026</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>By using Clippy, you agree to these terms. If you do not agree, do not use the service.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">2. Service Description</h2>
          <p>Clippy provides an AI-powered co-agent platform for real estate professionals, including lead management, communication drafting, pipeline tracking, and compliance monitoring.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">3. User Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to use the service in compliance with all applicable laws and regulations.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">4. AI-Generated Content</h2>
          <p>AI-generated content is provided as a draft and should be reviewed before use. Clippy is not liable for errors or omissions in AI-generated content.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">5. Limitation of Liability</h2>
          <p>Clippy is provided "as is" without warranty. We are not liable for any damages arising from the use of our service.</p>
        </div>
      </div>
    </div>
  );
}
