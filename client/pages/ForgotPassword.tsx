import Placeholder from "@/components/Placeholder";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

export default function ForgotPassword() {
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
          <Placeholder
            title="Password Recovery Coming Soon"
            description="Forgot your password? We'll help you reset it securely."
            icon={Mail}
          />

          <div className="mt-8">
            <Link
              to="/login"
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
