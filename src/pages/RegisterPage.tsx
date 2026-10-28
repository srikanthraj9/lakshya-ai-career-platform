import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Compass,
  Loader2,
  Sparkles,
  Target,
  Brain,
  Mic,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api, getApiErrorMessage, resolveApiBaseUrl } from "@/services/api";

const FEATURE_HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Resume Intelligence",
    description: "Analyze your resume and understand your 5-factor ATS readiness.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Target,
    title: "Career Alignment",
    description: "Discover how your competencies match target industry roles.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Brain,
    title: "Skill Growth & Roadmaps",
    description: "Identify missing skills and follow structured career pathways.",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Mic,
    title: "Interview Readiness",
    description: "Practice AI-powered text & voice interviews with real-time scoring.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password evaluation logic
  const passwordStats = useMemo(() => {
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (hasMinLen) score += 1;
    if (hasUpper && hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    let label = "Weak";
    let colorClass = "bg-destructive";
    let textClass = "text-destructive";

    if (score === 2) {
      label = "Fair";
      colorClass = "bg-amber-500";
      textClass = "text-amber-500";
    } else if (score === 3) {
      label = "Good";
      colorClass = "bg-accent";
      textClass = "text-accent";
    } else if (score >= 4) {
      label = "Strong";
      colorClass = "bg-emerald-500";
      textClass = "text-emerald-500";
    }

    return {
      score,
      label,
      colorClass,
      textClass,
      hasMinLen,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    };
  }, [password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName || trimmedName.length < 2) {
        setErrorMessage("Please enter your full name (minimum 2 characters).");
        return;
      }

      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }

      if (passwordStats.score < 2 || password.length < 8) {
        setErrorMessage("Please create a stronger password with at least 8 characters.");
        return;
      }

      if (!agreeTerms) {
        setErrorMessage("You must agree to the Terms of Service and Privacy Policy.");
        return;
      }

      setLoading(true);
      try {
        const res = await register(trimmedName, trimmedEmail, password);
        setErrorMessage(null);
        if (res && res.email_sent === false) {
          toast.warning(
            res.message || "Account created, but verification email could not be delivered. Please click Resend on the next screen.",
            { duration: 6000 },
          );
        } else {
          toast.success("Account created! Please verify your email to begin onboarding.");
        }
        navigate("/verify-email", { state: { emailSent: res?.email_sent !== false } });
      } catch (error) {
        const message = getApiErrorMessage(error);
        setErrorMessage(message);
        console.error("[Register Error]", { email: trimmedEmail, message });
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [fullName, email, password, passwordStats, agreeTerms, register, navigate],
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Background Ambient Glow & Floating Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute -top-40 -left-40 h-[550px] w-[550px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="animate-float-slow absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/10 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left Side: Experience Showcase Panel (Desktop) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden space-y-8 lg:col-span-6 lg:block xl:col-span-7"
        >
          {/* Logo Brand Header */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105" aria-label="Go to homepage">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-lg shadow-primary/20">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background">
                  <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
              </div>
              <div>
                <span className="font-display text-2xl font-bold tracking-tight gradient-text">LakshyaAI</span>
                <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Intelligence Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Headline & Subtitle */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
              Build your career with <span className="gradient-text">intelligence</span>.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              LakshyaAI analyzes your skills, resume, goals, and progress to help you understand exactly what to improve next.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {FEATURE_HIGHLIGHTS.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * (idx + 1) }}
                whileHover={{ y: -3 }}
                className="glass-card glass-card-hover rounded-xl p-4 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${feature.bgColor}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{feature.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Privacy & Trust Badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Secure 256-bit encryption. Your career data remains private and confidential.</span>
          </div>
        </motion.div>

        {/* Right Side: Registration Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 xl:col-span-5"
        >
          <div className="glass-card glow-primary relative rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Mobile Header (Shown on small screens) */}
            <div className="mb-6 text-center lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
                <Compass className="h-7 w-7 text-primary" aria-hidden="true" />
                <span className="font-display text-2xl font-bold gradient-text">LakshyaAI</span>
              </Link>
              <p className="mt-1.5 text-xs text-muted-foreground">AI-Powered Career Intelligence</p>
            </div>

            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Create Account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Personalized career intelligence from day one.
              </p>
            </div>

            {/* Google OAuth */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading || loading}
                className="relative w-full border-border/70 bg-secondary/30 text-sm font-medium transition-colors hover:bg-secondary/60 disabled:opacity-70"
                onClick={async () => {
                  setGoogleLoading(true);
                  setErrorMessage(null);
                  try {
                    const res = await api.get<{ url: string }>("/auth/google/url");
                    if (res.data?.url) {
                      window.location.href = res.data.url;
                      return;
                    }
                  } catch (err: unknown) {
                    console.warn("[Google Auth] /auth/google/url probe error:", err);
                    const msg = getApiErrorMessage(err);
                    if (msg.toLowerCase().includes("network error") || msg.toLowerCase().includes("failed to fetch")) {
                      const errorText = "FastAPI backend server is unreachable at http://127.0.0.1:10000. Please start the backend service.";
                      setErrorMessage(errorText);
                      toast.error(errorText);
                      setGoogleLoading(false);
                      return;
                    }
                  }
                  const backendBase = resolveApiBaseUrl();
                  window.location.href = `${backendBase.replace(/\/+$/, "")}/auth/google/login`;
                }}
                aria-label="Continue with Google"
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                ) : (
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
                )}
                {googleLoading ? "Connecting to Google..." : "Continue with Google"}
              </Button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="reg-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. Alex Morgan"
                  required
                  autoComplete="name"
                  className="bg-background/50 focus:border-primary"
                  aria-required="true"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="reg-email"
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

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Create Password
                  </Label>
                  {password.length > 0 && (
                    <span className={`text-xs font-medium ${passwordStats.textClass}`}>
                      {passwordStats.label}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Create a secure password"
                    required
                    autoComplete="new-password"
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-secondary/50">
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStats.score >= 1 ? passwordStats.colorClass : "bg-transparent"}`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStats.score >= 2 ? passwordStats.colorClass : "bg-transparent"}`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStats.score >= 3 ? passwordStats.colorClass : "bg-transparent"}`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStats.score >= 4 ? passwordStats.colorClass : "bg-transparent"}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className={`flex items-center gap-1 ${passwordStats.hasMinLen ? "text-emerald-400" : ""}`}>
                        {passwordStats.hasMinLen ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 8+ characters
                      </span>
                      <span className={`flex items-center gap-1 ${passwordStats.hasUpper && passwordStats.hasLower ? "text-emerald-400" : ""}`}>
                        {passwordStats.hasUpper && passwordStats.hasLower ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Upper & lower case
                      </span>
                      <span className={`flex items-center gap-1 ${passwordStats.hasNumber ? "text-emerald-400" : ""}`}>
                        {passwordStats.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} At least one number
                      </span>
                      <span className={`flex items-center gap-1 ${passwordStats.hasSpecial ? "text-emerald-400" : ""}`}>
                        {passwordStats.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start space-x-2 pt-1">
                <Checkbox
                  id="reg-terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => {
                    setAgreeTerms(checked === true);
                    setErrorMessage(null);
                  }}
                  className="mt-0.5"
                />
                <label
                  htmlFor="reg-terms"
                  className="text-xs leading-normal text-muted-foreground cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <Link to="/" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* Inline Error Display */}
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                >
                  {errorMessage}
                </motion.p>
              )}

              {/* Submit CTA Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:opacity-95 hover:shadow-primary/40 disabled:cursor-not-allowed"
                aria-label="Start My Career Journey"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Start My Career Journey
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Existing User Login Link */}
            <div className="mt-6 border-t border-border/40 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
