import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { sessionService } from "@/services/sessionService";
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
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getApiErrorMessage } from "@/services/api";

const COOLDOWN_SECONDS = 60;
const POLLING_INTERVAL_MS = 3000;

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
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);
  const [verifiedTargetUrl, setVerifiedTargetUrl] = useState<string>("/onboarding");

  const initialDeliveryFailed = (location.state as { emailSent?: boolean } | null)?.emailSent === false;
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(
    initialDeliveryFailed
      ? "Verification email could not be sent automatically. Please click 'Resend Verification Email' below."
      : null,
  );

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const isRedirectingRef = useRef<boolean>(false);
  const attemptedTokenRef = useRef<string | null>(null);

  // If already verified and logged in, redirect to onboarding or dashboard
  useEffect(() => {
    if (isEmailVerified && !verifying) {
      if (user?.onboarding_completed) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [isEmailVerified, user, verifying, navigate]);

  // Handle Token verification from URL query param (e.g. Device 2 click)
  const handleVerifyToken = useCallback(
    async (token: string) => {
      setVerifying(true);
      setErrorMessage(null);
      setIsTokenExpired(false);

      try {
        const response = await authService.verifyEmail({ token });
        setVerificationSuccess(true);
        toast.success(response.message || "Email verified successfully!");

        // If backend returned access token, store it in session
        if (response.access_token) {
          const freshUser = await setAuthSession(response.access_token);
          const target = freshUser?.onboarding_completed ? "/dashboard" : "/onboarding";
          setVerifiedTargetUrl(target);
          setTimeout(() => {
            if (!isRedirectingRef.current) {
              isRedirectingRef.current = true;
              navigate(target, { replace: true });
            }
          }, 1500);
        } else {
          const freshUser = await refreshUser();
          const target = freshUser?.onboarding_completed ? "/dashboard" : "/onboarding";
          setVerifiedTargetUrl(target);
          setTimeout(() => {
            if (!isRedirectingRef.current) {
              isRedirectingRef.current = true;
              navigate(target, { replace: true });
            }
          }, 1500);
        }
      } catch (error) {
        const message = getApiErrorMessage(error);
        setErrorMessage(message);
        if (message.toLowerCase().includes("expired")) {
          setIsTokenExpired(true);
        }
        toast.error(message);
      } finally {
        setVerifying(false);
      }
    },
    [setAuthSession, refreshUser, navigate],
  );

  useEffect(() => {
    if (tokenFromUrl && !verificationSuccess && !verifying && attemptedTokenRef.current !== tokenFromUrl) {
      attemptedTokenRef.current = tokenFromUrl;
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

  // Target email for status check and resending
  const targetEmail = (pendingEmail || user?.email || "").trim().toLowerCase();
  const displayEmail = targetEmail || "your registered email address";

  // Automatic Cross-Device Polling Effect
  useEffect(() => {
    // Do not poll if already verified, currently verifying a token, or redirecting
    if (verificationSuccess || verifying || isEmailVerified || isRedirectingRef.current) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Require an identifiable anchor: either an authenticated session token or target email
    const hasSession = !!sessionService.getToken();
    if (!hasSession && !targetEmail) {
      return;
    }

    let isSubscribed = true;

    const checkVerificationStatus = async () => {
      try {
        const res = await authService.getVerificationStatus(
          targetEmail ? { email: targetEmail } : undefined,
        );

        if (!isSubscribed) return;

        // Reset consecutive error counter on successful communication
        consecutiveErrorsRef.current = 0;
        setNetworkNotice(null);

        if (res.is_email_verified) {
          // Detected verification on another device!
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }

          setVerificationSuccess(true);
          toast.success("Email verified on another device! Continuing...");

          // If this client holds a session token, sync user state
          if (sessionService.getToken()) {
            const freshUser = await refreshUser();
            const target = (freshUser?.onboarding_completed || res.onboarding_completed)
              ? "/dashboard"
              : "/onboarding";
            setVerifiedTargetUrl(target);

            setTimeout(() => {
              if (isSubscribed && !isRedirectingRef.current) {
                isRedirectingRef.current = true;
                navigate(target, { replace: true });
              }
            }, 1500);
          } else {
            // Unauthenticated client detected verification
            setVerifiedTargetUrl("/login");
          }
        }
      } catch (err) {
        if (!isSubscribed) return;

        // Tolerant retry on recoverable network or temporary rate limit
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= 4) {
          setNetworkNotice("Checking verification status is taking longer than expected. Retrying automatically...");
        }
      }
    };

    // Run initial check after short initial delay, then interval
    pollTimerRef.current = setInterval(checkVerificationStatus, POLLING_INTERVAL_MS);

    return () => {
      isSubscribed = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [verificationSuccess, verifying, isEmailVerified, targetEmail, refreshUser, navigate]);

  const handleResend = async () => {
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrorMessage("No valid registered email address found. Please try logging in or registering again.");
      return;
    }

    setResending(true);
    setErrorMessage(null);
    setIsTokenExpired(false);

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
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isRedirectingRef.current = true;
    navigate(verifiedTargetUrl, { replace: true });
  };

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

          <AnimatePresence>
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
                    {sessionService.getToken()
                      ? "Your account is activated. Redirecting you to your career workspace..."
                      : "Your account is activated. Please sign in to access your LakshyaAI dashboard."}
                  </p>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
                >
                  {sessionService.getToken() ? "Continue to Career Onboarding" : "Sign In to Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* 3. Expired Link State */}
            {isTokenExpired && !verificationSuccess && !verifying && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5 py-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-9 w-9" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="font-display text-2xl font-bold text-foreground">Verification Link Expired</h1>
                  <p className="text-sm text-muted-foreground">
                    Security links expire after 24 hours. Request a fresh verification link below.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="w-full bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending New Link...
                    </>
                  ) : cooldown > 0 ? (
                    `Resend available in ${cooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Request New Verification Link
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* 4. Pending Verification Instructions / Polling */}
            {!verificationSuccess && !verifying && !isTokenExpired && (
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
                    Open the link on this device, your phone, or any other browser. This screen updates automatically upon verification.
                  </p>
                </div>

                {/* Cross-device auto-detection pulse banner */}
                <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs font-medium text-primary shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Listening for verification across devices...</span>
                </div>

                {networkNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-left text-xs font-medium text-blue-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-0.5 animate-spin" />
                    <span>{networkNotice}</span>
                  </motion.div>
                )}

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
                        if (pollTimerRef.current) {
                          clearInterval(pollTimerRef.current);
                          pollTimerRef.current = null;
                        }
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
                      if (pollTimerRef.current) {
                        clearInterval(pollTimerRef.current);
                        pollTimerRef.current = null;
                      }
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
