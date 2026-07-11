import dynamic from "next/dynamic";

const SignInClient = dynamic(() => import("./sign-in-client"), { ssr: false });

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <SignInClient />
      </div>
    </div>
  );
}
