import Link from "next/link";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">&larr; Back to home</Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Security</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>Clippy takes the security of your data seriously. We use industry-standard encryption and security practices to protect your information.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Data Encryption</h2>
          <p>All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Your data is stored in ISO 27001 certified data centers.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Access Control</h2>
          <p>We use role-based access control to ensure only authorized users can access your data. Multi-factor authentication is available for all accounts.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Compliance</h2>
          <p>Clippy is SOC 2 compliant and follows GDPR guidelines. We undergo regular third-party security audits.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Data Retention</h2>
          <p>You retain full ownership of your data. You can export or delete your data at any time. We retain data only as long as your account is active.</p>
        </div>
      </div>
    </div>
  );
}
