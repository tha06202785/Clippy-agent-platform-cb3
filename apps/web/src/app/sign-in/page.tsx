import Link from "next/link";
import { SignInClient } from "@/components/sign-in-client";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-foreground font-bold text-lg">Clippy</span>
          </Link>
        </div>
        <SignInClient />
      </div>
    </div>
  );
}
