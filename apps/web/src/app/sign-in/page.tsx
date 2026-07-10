import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-foreground font-bold text-lg">Clippy</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Sign in to Clippy</h1>
        <p className="text-muted-foreground mb-6">Sign in to access your dashboard, leads, and deals.</p>
        <a href="https://accounts.clippy.com/sign-in" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Sign in with Clerk
        </a>
      </div>
    </div>
  );
}
