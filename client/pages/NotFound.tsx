import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-clippy-50 via-white to-clippy-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="bg-destructive/10 p-4 rounded-2xl mb-6 inline-flex">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Oops! Page not found
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          The page you're looking for doesn't exist. It may have been moved or deleted.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Home className="w-5 h-5" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
