import Placeholder from "@/components/Placeholder";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-clippy-50 via-white to-clippy-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Link to="/login" className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold flex items-center gap-2">
            ← Back to Login
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-clippy-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">C</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center mb-1">Join Clippy</h1>
            <p className="text-center text-muted-foreground text-sm">
              Create your account to get started
            </p>
          </div>

          <Placeholder
            title="Sign Up Coming Soon"
            description="Create your Clippy account and start managing your real estate business with AI-powered tools."
            icon={UserPlus}
          />

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
