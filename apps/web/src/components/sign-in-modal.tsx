"use client";
import { ClerkProvider, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInModal() {
  return (
    <ClerkProvider>
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-foreground font-bold text-lg">Clippy</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to Clippy</h1>
        <p className="text-muted-foreground mb-6">Access your dashboard, leads, and deals.</p>
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Sign in
          </button>
        </SignInButton>
      </div>
    </ClerkProvider>
  );
}
