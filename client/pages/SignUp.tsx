import { useState, useEffect } from "react"; // Added useState and useEffect
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate for redirection
import { UserPlus } from "lucide-react";
import { createClient } from "@supabase/supabase-js"; // Added createClient for Supabase

// --- Supabase Project URL and Anon Key (Already Replaced) ---
const SUPABASE_URL = "https://mqydieqeybgxtjqogrwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgi9j879wWGlzEQbt0i7Yw_D7rYZG3g";
// -----------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Hook for programmatic navigation

  useEffect(() => {
    // Check if user is already logged in on page load
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('User already logged in, redirecting to dashboard:', session.user);
        navigate('/dashboard'); // Redirect to dashboard if session exists
      }
    };
    checkUserSession();

    // Listen for auth state changes to redirect
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in, redirecting to dashboard.');
        navigate('/dashboard');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSupabaseAuth = async (isSignUp: boolean) => {
    setLoading(true);
    setError(null);

    try {
      let authResponse;
      if (isSignUp) {
        authResponse = await supabase.auth.signUp({
          email: email,
          password: password,
        });
      } else {
        authResponse = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
      }

      if (authResponse.error) {
        throw authResponse.error;
      }

      const { user, session } = authResponse.data;

      if (user && session) {
        console.log('Authentication successful:', user);
        alert(`Welcome, ${user.email}! Redirecting to dashboard...`);
        navigate('/dashboard'); // Redirect to dashboard
      } else if (isSignUp && !user) {
        // For sign-up, if email confirmation is required, user might be null initially
        alert("Please check your email to confirm your account!");
        navigate('/check-email'); // You might need to create this page in Builder.io
      } else {
        console.warn('Authentication response did not contain user or session:', authResponse);
        setError("Authentication completed, but no user/session found. Check server logs or email confirmation.");
      }

    } catch (err: any) {
      console.error('Authentication error:', err.message);
      setError(`Authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clippy-50 via-white to-clippy-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          {/* Removed "Back to Login" as this page now handles both or is the entry */}
        </div>
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-clippy-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">C</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center mb-1">
              Join Clippy
            </h1>
            <p className="text-center text-muted-foreground text-sm">
              Create your account or sign in to get started
            </p>
          </div>

          {/* Actual Login/Signup Form */}
          <div className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground text-left mb-1">Email</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                className="w-full p-2 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground text-left mb-1">Password</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                className="w-full p-2 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              onClick={() => handleSupabaseAuth(false)} // Sign In
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <button
              onClick={() => handleSupabaseAuth(true)} // Sign Up
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg border border-primary text-primary bg-transparent font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </div>

          <div className="mt-8 text-center">
            {/* "Already have an account?" text is now redundant if both are on this page, but kept for context */}
            <p className="text-muted-foreground text-sm">
              Forgot your password?{" "}
              <Link to="/reset-password" className="text-primary font-semibold hover:text-primary/80">
                Reset it
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
