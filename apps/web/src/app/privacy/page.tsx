import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">&larr; Back to home</Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>Last updated: July 2026</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Information We Collect</h2>
          <p>We collect information you provide when creating an account, including your name, email address, and phone number. We also collect data about your leads, listings, and communications to provide our AI co-agent services.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">How We Use Your Information</h2>
          <p>Your information is used to provide and improve our services, including AI-powered lead management, communication drafting, and pipeline tracking. We never sell your data to third parties.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Data Sharing</h2>
          <p>We share data with service providers who help us operate our platform (e.g., cloud hosting, AI inference). These providers are contractually bound to protect your data.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data at any time. Contact us at privacy@clippy.ai for requests.</p>
        </div>
      </div>
    </div>
  );
}
