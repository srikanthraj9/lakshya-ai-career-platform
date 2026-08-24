import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Compass, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getApiErrorMessage } from "@/services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to appropriate route
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      return;
    }

    const isAdmin = user.role === "admin" || user.role === "super_admin";

    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else if (!user.is_email_verified) {
      navigate("/verify-email", { replace: true });
    } else if (!user.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        setErrorMessage("Please enter your email address.");
        return;
      }
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }

      setLoading(true);
      try {
        const loggedUser = await login(trimmedEmail, password);
        setErrorMessage(null);
        toast.success("Signed in successfully!");

        const isAdmin = loggedUser?.role === "admin" || loggedUser?.role === "super_admin";

        if (isAdmin) {
          navigate("/admin");
        } else if (!loggedUser?.is_email_verified) {
          navigate("/verify-email");
        } else if (!loggedUser?.onboarding_completed) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        const message = getApiErrorMessage(error);
        setErrorMessage(message);
        console.error("[Login Error]", { email: trimmedEmail, message, source: "LoginPage.handleSubmit" });
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, login, navigate],
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="animate-float-slow absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card glow-primary relative z-10 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 transition-transform hover:scale-105" aria-label="Go to homepage">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-md shadow-primary/20">
              <div className="flex h-full w-full items-center justify-center rounded-[9px] bg-background">
                <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
            </div>
            <span className="font-display text-2xl font-bold gradient-text">LakshyaAI</span>
          </Link>
          <h1 className="mt-4 font-display text-xl font-bold text-foreground">Welcome Back</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to access your personalized career intelligence workspace.
          </p>
        </div>

        {/* Google OAuth UI */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="relative w-full border-border/70 bg-secondary/30 text-xs font-medium transition-colors hover:bg-secondary/60"
            onClick={() => {
              const backendBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:10000/api";
              window.location.href = `${backendBase.replace(/\/+$/, "")}/auth/google/login`;
            }}
            aria-label="Continue with Google"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <span className="relative bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              Or sign in with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="bg-background/50 focus:border-primary"
              aria-required="true"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-background/50 pr-10 focus:border-primary"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {errorMessage}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:opacity-95 hover:shadow-primary/40 disabled:cursor-not-allowed"
            aria-label="Sign In"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create an Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
