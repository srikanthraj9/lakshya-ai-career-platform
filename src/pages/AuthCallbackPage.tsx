import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get("token");
      const err = searchParams.get("error");
      const onboardingCompletedParam = searchParams.get("onboarding_completed");

      if (err) {
        console.error("[Google Auth Error]", err);
        setError(`Google authentication failed: ${err}`);
        toast.error(`Google authentication error: ${err}`);
        setTimeout(() => navigate("/login", { replace: true }), 2500);
        return;
      }

      if (!token) {
        setError("No authentication token received from provider.");
        toast.error("Authentication failed. Missing token.");
        setTimeout(() => navigate("/login", { replace: true }), 2500);
        return;
      }

      try {
        const user = await setAuthSession(token);
        toast.success(`Welcome back, ${user.full_name || "User"}!`);

        const isCompleted =
          onboardingCompletedParam === "true" || user.onboarding_completed;

        const isAdmin = user.role === "admin" || user.role === "super_admin";

        if (isAdmin) {
          navigate("/admin", { replace: true });
        } else if (!user.is_email_verified) {
          navigate("/verify-email", { replace: true });
        } else if (!isCompleted) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback Error]", e);
        setError("Failed to initialize session. Please try logging in again.");
        toast.error("Session initialization failed.");
        setTimeout(() => navigate("/login", { replace: true }), 2500);
      }
    };

    processCallback();
  }, [searchParams, setAuthSession, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="glass-card glow-primary flex max-w-sm flex-col items-center rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
        {error ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-9 w-9 animate-spin text-primary mx-auto" />
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Completing Sign-In</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Authenticating with Google and securing your session...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
