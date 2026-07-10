"use client";
import { SignIn, ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";

export function SignInPageClient() {
  return (
    <ClerkProvider>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
              <span className="text-foreground font-bold text-lg">Clippy</span>
            </Link>
          </div>
          <SignIn />
        </div>
      </div>
    </ClerkProvider>
  );
}
