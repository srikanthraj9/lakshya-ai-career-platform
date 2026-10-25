import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Compass,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getApiErrorMessage } from "@/services/api";

const COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const tokenFromUrl = searchParams.get("token");

  const {
    user,
    pendingEmail,
    setAuthSession,
    refreshUser,
    logout,
    isEmailVerified,
  } = useAuth();

  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialDeliveryFailed = (location.state as { emailSent?: boolean } | null)?.emailSent === false;
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(
    initialDeliveryFailed
      ? "Verification email could not be sent automatically. Please click 'Resend Verification Email' below."
      : null,
  );

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // If already verified and logged in, redirect to onboarding or dashboard
  useEffect(() => {
    if (isEmailVerified) {
      if (user?.onboarding_completed) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [isEmailVerified, user, navigate]);

  // Handle Token verification from URL query param
  const handleVerifyToken = useCallback(
    async (token: string) => {
      setVerifying(true);
      setErrorMessage(null);

      try {
        const response = await authService.verifyEmail({ token });
        setVerificationSuccess(true);
        toast.success(response.message || "Email verified successfully!");

        // If backend returned access token, store it in session
        if (response.access_token) {
          await setAuthSession(response.access_token);
        } else {
          await refreshUser();
        }
      } catch (error) {
        const message = getApiErrorMessage(error);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setVerifying(false);
      }
    },
    [setAuthSession, refreshUser],
  );

  useEffect(() => {
    if (tokenFromUrl && !verificationSuccess && !verifying) {
      handleVerifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl, handleVerifyToken, verificationSuccess, verifying]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [cooldown]);

  const handleResend = async () => {
    const targetEmail = (pendingEmail || user?.email || "").trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrorMessage("No valid registered email address found. Please try logging in or registering again.");
      return;
    }

    setResending(true);
    setErrorMessage(null);

    try {
      const response = await authService.resendVerification({ email: targetEmail });
      if (response.email_sent === false) {
        setErrorMessage(response.message || "Failed to deliver verification email. Please try again.");
        toast.error(response.message || "Failed to send verification email.");
      } else {
        setDeliveryWarning(null);
        setCooldown(COOLDOWN_SECONDS);
        toast.success(response.message || "Verification email sent. Check your inbox!");
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);

      // Synchronize cooldown if backend returned 429 with remaining seconds
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const detail = (error.response.data as { detail?: string; error?: { message?: string } })?.detail
          || (error.response.data as { detail?: string; error?: { message?: string } })?.error?.message;
        if (typeof detail === "string") {
          const match = detail.match(/(\d+)\s*seconds?/i);
          if (match && match[1]) {
            const seconds = parseInt(match[1], 10);
            if (!isNaN(seconds) && seconds > 0) {
              setCooldown(seconds);
            }
          }
        }
      }
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    navigate("/onboarding", { replace: true });
  };

  const displayEmail = pendingEmail || user?.email || "your registered email address";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="animate-float-slow absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-card glow-primary rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-xl text-center"
        >
          {/* Brand Header */}
          <div className="mb-6 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              <Compass className="h-7 w-7 text-primary" aria-hidden="true" />
              <span className="font-display text-2xl font-bold gradient-text">LakshyaAI</span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {/* 1. Verifying token in progress */}
            {verifying && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 py-6"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground">Verifying Email...</h1>
                <p className="text-sm text-muted-foreground">
                  Validating your secure verification token with LakshyaAI.
                </p>
              </motion.div>
            )}

            {/* 2. Verification Success */}
            {verificationSuccess && !verifying && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5 py-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="font-display text-2xl font-bold text-foreground">Email Verified!</h1>
                  <p className="text-sm text-muted-foreground">
                    Your account is activated. Let's personalize your LakshyaAI career workspace.
                  </p>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
                >
                  Continue to Career Onboarding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* 3. Pending Verification Instructions / Token Error */}
            {!verificationSuccess && !verifying && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Mail className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-display text-2xl font-bold text-foreground">Check Your Inbox</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We've sent a secure verification link to:
                  </p>
                  <div className="inline-block rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-foreground break-all">
                    {displayEmail}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please click the link in the email to verify your address and continue your career onboarding.
                  </p>
                </div>

                {deliveryWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs font-medium text-amber-400"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{deliveryWarning}</span>
                  </motion.div>
                )}

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-xs font-medium text-destructive"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resending || cooldown > 0}
                    onClick={() => handleResend()}
                    className="w-full border-border/80 text-sm font-medium transition-colors hover:bg-secondary/60"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending Email...
                      </>
                    ) : cooldown > 0 ? (
                      `Resend available in ${cooldown}s`
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>

                  {/* Safe option if user entered the wrong email during registration */}
                  <div className="border-t border-border/40 pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Wrong email address or typo?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate("/register");
                      }}
                      className="text-xs text-primary hover:underline font-medium transition-colors"
                    >
                      Register with a different email address →
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out & Return
                  </button>

                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
