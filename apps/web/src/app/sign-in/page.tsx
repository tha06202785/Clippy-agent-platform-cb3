import { SignInWrapper } from "@/components/sign-in-wrapper";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <SignInWrapper />
      </div>
    </div>
  );
}
