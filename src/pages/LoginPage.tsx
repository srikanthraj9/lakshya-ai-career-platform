import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getApiErrorMessage } from "@/services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      await login(email, password);
      setErrorMessage(null);
      toast.success("Logged in successfully!");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      console.error("[Login Error]", { email, message, source: "LoginPage.handleSubmit" });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
            <Compass className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="font-display text-2xl font-bold gradient-text">LakshyaAI</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Welcome back! Sign in to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }} placeholder="you@example.com" required autoComplete="email" aria-required="true" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }} placeholder="••••••••" required autoComplete="current-password" aria-required="true" />
          </div>
          {errorMessage ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" variant="gradient" className="w-full" disabled={loading} aria-label="Sign in">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
