import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, useInView } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Compass,
  ArrowRight,
  Sparkles,
  Target,
  Brain,
  Mic,
  Briefcase,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Cpu,
  UserCheck,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Check,
  Info,
} from "lucide-react";

// ==========================================
// TYPED DATA INTERFACES
// ==========================================

interface JourneyStep {
  number: string;
  title: string;
  description: string;
  icon: typeof UserCheck;
}

interface FeaturePillar {
  pillar: string;
  badge: string;
  title: string;
  description: string;
  icon: typeof Brain;
  accentColor: string;
  borderColor: string;
  bgGlow: string;
  badgeClass: string;
  glowColor: string;
  features: {
    title: string;
    description: string;
  }[];
  ctaText: string;
  details: string[];
}

// ==========================================
// STATIC DATA DEFINITIONS
// ==========================================

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: "01",
    title: "Tell Us About You",
    description: "Share your goals, background, education, and current skill set.",
    icon: UserCheck,
  },
  {
    number: "02",
    title: "AI Understands Your Profile",
    description: "Analyze your resume, skills, strengths, and career trajectory.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Discover What Matters Next",
    description: "Identify high-impact skill gaps, role alignment, and readiness.",
    icon: Target,
  },
  {
    number: "04",
    title: "Follow Your Roadmap",
    description: "Execute clear action steps, practice AI interviews, and move toward your target role.",
    icon: Compass,
  },
];

const PILLARS: FeaturePillar[] = [
  {
    pillar: "UNDERSTAND",
    badge: "UNDERSTAND",
    title: "Resume & Skill Intelligence",
    description: "Understand your current position before deciding what to do next.",
    icon: Brain,
    accentColor: "text-purple-400",
    borderColor: "hover:border-purple-500/40",
    bgGlow: "group-hover:shadow-[0_0_35px_-8px_hsl(262_83%_58%/0.2)]",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    glowColor: "rgba(168, 85, 247, 0.12)",
    features: [
      {
        title: "5-Factor ATS Intelligence",
        description: "Evaluates keywords, structure, readability, and action verbs.",
      },
      {
        title: "Skill Gap Detection",
        description: "Benchmarks your profile against industry expectations.",
      },
      {
        title: "Career Strength Analysis",
        description: "Highlights your strongest differentiators.",
      },
      {
        title: "AI Resume Improvement",
        description: "Provides actionable suggestions to strengthen your resume.",
      },
    ],
    ctaText: "Explore Understand →",
    details: [
      "5-Factor ATS scoring benchmarked across 50,000+ technical job descriptions",
      "Instant missing keyword detection with industry taxonomy mapping",
      "Automated LaTeX source code generation and PDF compilation",
      "Semantic skill depth quantification with STAR-method bullet refinement",
    ],
  },
  {
    pillar: "PREPARE",
    badge: "PREPARE",
    title: "Role Readiness & Interview AI",
    description: "Build the skills and confidence needed for your next opportunity.",
    icon: Target,
    accentColor: "text-blue-400",
    borderColor: "hover:border-blue-500/40",
    bgGlow: "group-hover:shadow-[0_0_35px_-8px_hsl(217_91%_60%/0.2)]",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    glowColor: "rgba(59, 130, 246, 0.12)",
    features: [
      {
        title: "Role Readiness Engine",
        description: "Measures your alignment with target roles.",
      },
      {
        title: "Adaptive Mock Interviews",
        description: "Practice technical and behavioral interviews.",
      },
      {
        title: "Real-Time Voice & Text AI Practice",
        description: "Receive feedback on clarity, fluency, and answers.",
      },
      {
        title: "Personalized Roadmaps",
        description: "Follow milestone-based learning built around your goals.",
      },
    ],
    ctaText: "Explore Prepare →",
    details: [
      "Role alignment scoring across 1,500+ standard tech career profiles",
      "Multi-turn adaptive mock interviews with contextual difficulty adjustment",
      "Voice AI speech transcription with latency under 400ms",
      "Detailed scoring on technical precision, communication pace, and delivery fluency",
    ],
  },
  {
    pillar: "DISCOVER",
    badge: "DISCOVER",
    title: "Opportunities & Analytics",
    description: "Discover opportunities aligned with your skills and goals.",
    icon: Compass,
    accentColor: "text-teal-400",
    borderColor: "hover:border-teal-500/40",
    bgGlow: "group-hover:shadow-[0_0_35px_-8px_hsl(175_80%_45%/0.2)]",
    badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    glowColor: "rgba(20, 184, 166, 0.12)",
    features: [
      {
        title: "Smart Job Matching",
        description: "Find opportunities relevant to your profile.",
      },
      {
        title: "Live Market Insights",
        description: "Understand current role and skill demand.",
      },
      {
        title: "Longitudinal Analytics",
        description: "Track improvements in readiness and performance.",
      },
      {
        title: "24/7 Career Copilot",
        description: "Get AI assistance for career decisions and preparation.",
      },
    ],
    ctaText: "Explore Discover →",
    details: [
      "Semantic job matching matching candidates based on true competency fit",
      "Live job search feed aggregated across verified engineering roles",
      "Longitudinal ATS score improvement and skill acquisition timeline charts",
      "Conversational Career Copilot for personalized negotiation & strategy prompts",
    ],
  },
];

const CAPABILITY_TOOLTIPS = [
  {
    icon: FileCheck,
    label: "5-Factor ATS Intelligence",
    color: "text-primary",
    tooltip: "Analyzes keywords, structure, readability, relevance, and action-oriented language.",
  },
  {
    icon: Target,
    label: "1,500+ Role Benchmarks",
    color: "text-accent",
    tooltip: "Compares your profile against skill expectations for relevant career roles.",
  },
  {
    icon: Brain,
    label: "Personalized Skill Roadmaps",
    color: "text-purple-400",
    tooltip: "Step-by-step milestone curriculum built specifically for your target role.",
  },
  {
    icon: Mic,
    label: "Real-Time Voice & Text AI Practice",
    color: "text-emerald-400",
    tooltip: "Evaluates spoken and written answers on fluency, pace, technical depth, and delivery.",
  },
  {
    icon: ShieldCheck,
    label: "Private & Encrypted",
    color: "text-primary",
    tooltip: "Enterprise-grade 256-bit encryption. Your career data remains private and confidential.",
  },
];

// ==========================================
// 1. MAGNETIC BUTTON COMPONENT
// ==========================================

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  asChild?: boolean;
}

const MagneticButton = memo(function MagneticButton({
  children,
  className = "",
  onClick,
}: MagneticButtonProps) {
  const prefersReduced = useReducedMotion();
  const buttonRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 250, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * 0.18;
    const deltaY = (e.clientY - centerY) * 0.18;

    // Constrain maximum translation to 5px
    const clampedX = Math.max(-5, Math.min(5, deltaX));
    const clampedY = Math.max(-5, Math.min(5, deltaY));

    x.set(clampedX);
    y.set(clampedY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-block transition-shadow duration-200 ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
});

// ==========================================
// 2. CURSOR PROXIMITY GLOW CARD
// ==========================================

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  style?: React.CSSProperties;
}

const GlowCard = memo(function GlowCard({
  children,
  className = "",
  glowColor = "rgba(147, 51, 234, 0.08)",
  style = {},
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCoords({ x: -100, y: -100 });
      }}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

// ==========================================
// 3. HERO PRODUCT INTELLIGENCE CARD (3D Tilt)
// ==========================================

const HeroIntelligenceCard = memo(function HeroIntelligenceCard() {
  const prefersReduced = useReducedMotion();
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const [animatedScore, setAnimatedScore] = useState(0);
  const cardInViewRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardInViewRef, { once: true, margin: "-50px" });

  // 3D Tilt Motion Values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.1 };
  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [3, -3]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-3, 3]), springConfig);

  // Parallax layers
  const badgeParallaxX = useSpring(useTransform(mouseX, [-150, 150], [-6, 6]), springConfig);
  const badgeParallaxY = useSpring(useTransform(mouseY, [-150, 150], [-6, 6]), springConfig);

  // Animated Readiness Score on View
  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      setAnimatedScore(78);
      return;
    }

    let start = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = 78 / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= 78) {
        setAnimatedScore(78);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, prefersReduced]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={cardContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto w-full max-w-lg lg:max-w-none perspective-1000"
    >
      {/* Floating Badge Top-Right */}
      <motion.div
        style={{
          x: prefersReduced ? 0 : badgeParallaxX,
          y: prefersReduced ? 0 : badgeParallaxY,
        }}
        animate={
          prefersReduced
            ? {}
            : {
                y: [-3, 3, -3],
                transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="absolute -top-4 -right-2 z-20 hidden items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-background/90 px-3 py-1.5 text-xs font-semibold text-emerald-400 shadow-xl backdrop-blur-md sm:flex"
      >
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        <span>↗ +14% ATS Potential</span>
      </motion.div>

      {/* Floating Badge Bottom-Left */}
      <motion.div
        style={{
          x: prefersReduced ? 0 : badgeParallaxX,
          y: prefersReduced ? 0 : badgeParallaxY,
        }}
        animate={
          prefersReduced
            ? {}
            : {
                y: [3, -3, 3],
                x: [-2, 2, -2],
                transition: { duration: 6.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="absolute -bottom-4 -left-2 z-20 hidden items-center gap-1.5 rounded-xl border border-primary/30 bg-background/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-xl backdrop-blur-md sm:flex"
      >
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span>🧠 3 Priority Skills Identified</span>
      </motion.div>

      {/* Floating Badge Bottom-Right */}
      <motion.div
        style={{
          x: prefersReduced ? 0 : badgeParallaxX,
          y: prefersReduced ? 0 : badgeParallaxY,
        }}
        animate={
          prefersReduced
            ? {}
            : {
                y: [-2, 4, -2],
                transition: { duration: 5.5, delay: 1, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="absolute -bottom-3 right-6 z-20 hidden items-center gap-1.5 rounded-xl border border-accent/30 bg-background/90 px-3 py-1.5 text-xs font-semibold text-accent shadow-xl backdrop-blur-md sm:flex"
      >
        <Mic className="h-3.5 w-3.5 text-accent" />
        <span>🎙 Interview Ready: 82%</span>
      </motion.div>

      {/* Main Glass 3D Tilt Card */}
      <motion.div
        ref={cardInViewRef}
        style={{
          rotateX: prefersReduced ? 0 : rotateX,
          rotateY: prefersReduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card glow-primary relative overflow-hidden rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-accent p-0.5 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-background">
                <Compass className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">LakshyaAI Intelligence</h3>
              <p className="text-[11px] text-muted-foreground">Live Profile Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>
        </div>

        {/* Career Readiness Score & Target Role */}
        <div className="my-4 grid grid-cols-12 items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4">
          {/* Circular Score Meter */}
          <div className="col-span-5 flex flex-col items-center justify-center border-r border-border/60 pr-2">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-secondary/70"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className="text-primary"
                  strokeDasharray={`${animatedScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="url(#hero-gradient-ring)"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <defs>
                  <linearGradient id="hero-gradient-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="font-display text-sm font-extrabold text-foreground">{animatedScore}%</span>
              </div>
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Career Readiness
            </span>
          </div>

          {/* Target Role & Progress */}
          <div className="col-span-7 pl-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              TARGET ROLE
            </span>
            <h4 className="font-display text-sm font-bold text-foreground sm:text-base">Full Stack Developer</h4>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${animatedScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                />
              </div>
              <span className="text-[10px] font-semibold text-primary">Strong Fit</span>
            </div>
          </div>
        </div>

        {/* Strengths & Next Priorities */}
        <div className="space-y-3 text-left">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              VERIFIED STRENGTHS
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["React", "TypeScript", "Node.js", "PostgreSQL"].map((skill, index) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className="inline-flex cursor-default items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/20"
                >
                  <Check className="h-3 w-3 text-primary" />
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="border-t border-border/40 pt-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              NEXT PRIORITY SKILLS
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-foreground font-medium">System Design</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-foreground font-medium">Docker & CI/CD</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

// ==========================================
// MAIN LANDING PAGE COMPONENT
// ==========================================

export default function LandingPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);
  const [selectedPillarModal, setSelectedPillarModal] = useState<FeaturePillar | null>(null);

  // Dashboard preview metrics in view
  const previewRef = useRef<HTMLDivElement>(null);
  const isPreviewInView = useInView(previewRef, { once: true, margin: "-50px" });
  const [previewReadiness, setPreviewReadiness] = useState(0);
  const [previewATS, setPreviewATS] = useState(0);
  const [previewInterview, setPreviewInterview] = useState(0);

  useEffect(() => {
    if (!isPreviewInView) return;

    if (prefersReduced) {
      setPreviewReadiness(78);
      setPreviewATS(86);
      setPreviewInterview(81);
      return;
    }

    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setPreviewReadiness(Math.min(78, Math.floor(78 * progress)));
      setPreviewATS(Math.min(86, Math.floor(86 * progress)));
      setPreviewInterview(Math.min(81, Math.floor(81 * progress)));

      if (step >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isPreviewInView, prefersReduced]);

  // Navbar scroll & active section detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      const heroEl = document.getElementById("hero");
      const pillarsEl = document.getElementById("pillars");
      const howItWorksEl = document.getElementById("how-it-works");
      const previewEl = document.getElementById("preview");

      const offset = 120;
      if (previewEl && scrollY >= previewEl.offsetTop - offset) {
        setActiveSection("preview");
      } else if (pillarsEl && scrollY >= pillarsEl.offsetTop - offset) {
        setActiveSection("pillars");
      } else if (howItWorksEl && scrollY >= howItWorksEl.offsetTop - offset) {
        setActiveSection("how-it-works");
      } else if (heroEl) {
        setActiveSection("hero");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler with sticky header offset (70px)
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* ==========================================
            1. NAVBAR (Sticky with Glass Scroll State)
        ========================================== */}
        <nav
          className={`fixed top-0 z-50 w-full transition-all duration-300 ${
            isScrolled
              ? "border-b border-border/60 bg-background/85 backdrop-blur-xl shadow-lg shadow-black/10"
              : "border-b border-border/30 bg-background/40 backdrop-blur-md"
          }`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-105" aria-label="LakshyaAI home">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-md shadow-primary/20">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background">
                  <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              </div>
              <span className="font-display text-xl font-extrabold tracking-tight gradient-text">LakshyaAI</span>
            </Link>

            {/* Center Navigation Links with Active State */}
            <div className="hidden items-center gap-7 md:flex">
              <button
                onClick={() => scrollToSection("pillars")}
                className={`relative text-sm font-medium transition-colors hover:text-foreground ${
                  activeSection === "pillars" ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                Pillars
                {activeSection === "pillars" && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>

              <button
                onClick={() => scrollToSection("how-it-works")}
                className={`relative text-sm font-medium transition-colors hover:text-foreground ${
                  activeSection === "how-it-works" ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                How It Works
                {activeSection === "how-it-works" && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>

              <button
                onClick={() => scrollToSection("preview")}
                className={`relative text-sm font-medium transition-colors hover:text-foreground ${
                  activeSection === "preview" ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                Workspace Preview
                {activeSection === "preview" && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="hidden items-center gap-3 md:flex">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <MagneticButton>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-md shadow-primary/20 transition-all hover:opacity-95"
                  asChild
                >
                  <Link to="/register">
                    Start Free <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </MagneticButton>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Drawer */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border-b border-border/60 bg-background/95 p-4 backdrop-blur-2xl md:hidden"
            >
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    scrollToSection("pillars");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Pillars
                </button>
                <button
                  onClick={() => {
                    scrollToSection("how-it-works");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  How It Works
                </button>
                <button
                  onClick={() => {
                    scrollToSection("preview");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Workspace Preview
                </button>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-white" asChild>
                    <Link to="/register">Start Free →</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </nav>

        <main>
          {/* ==========================================
              2. HERO SECTION
          ========================================== */}
          <section id="hero" className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24" aria-label="Hero">
            {/* Ambient Lighting & Glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="animate-float absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[140px]" />
              <div className="animate-float-slow absolute -bottom-40 right-1/4 h-[550px] w-[550px] rounded-full bg-accent/10 blur-[140px]" />
            </div>

            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
                {/* Left Side: Headline & Value Prop */}
                <motion.div
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6 text-center lg:col-span-7 lg:text-left"
                >
                  {/* AI Badge */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>✦ AI-Powered Career Intelligence</span>
                  </div>

                  {/* Main Headline */}
                  <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.12]">
                    Turn Your Potential Into <br className="hidden sm:inline" />
                    <span className="gradient-text">a Clear Career Path.</span>
                  </h1>

                  {/* Supporting Text */}
                  <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg lg:mx-0 leading-relaxed">
                    LakshyaAI analyzes your skills, resume, goals, and progress to help you understand where you stand, what to improve, and what to do next.
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                    <MagneticButton>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:opacity-95 hover:shadow-primary/40"
                        asChild
                      >
                        <Link to="/register">
                          Start Your Career Journey
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </MagneticButton>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => scrollToSection("how-it-works")}
                      className="w-full sm:w-auto border-border/80 bg-secondary/30 font-medium hover:bg-secondary/60 transition-colors"
                    >
                      See How It Works ↓
                    </Button>
                  </div>

                  {/* Three Proof Points */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ATS Intelligence
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Skill Gap Analysis
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      AI Interview Practice
                    </span>
                  </div>
                </motion.div>

                {/* Right Side: Hero Intelligence Card */}
                <div className="lg:col-span-5">
                  <HeroIntelligenceCard />
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              3. TRUST / CAPABILITY STRIP (with Tooltips)
          ========================================== */}
          <section className="border-y border-border/50 bg-secondary/20 py-5" aria-label="Capabilities">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-around gap-6 text-xs sm:text-sm font-semibold text-muted-foreground">
                {CAPABILITY_TOOLTIPS.map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <Tooltip key={cap.label}>
                      <TooltipTrigger asChild>
                        <div className="flex cursor-help items-center gap-2 transition-colors hover:text-foreground">
                          <Icon className={`h-4 w-4 ${cap.color}`} />
                          <span>{cap.label}</span>
                          <Info className="h-3 w-3 opacity-40" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                        {cap.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ==========================================
              4. HOW IT WORKS (Connected Journey)
          ========================================== */}
          <section id="how-it-works" className="relative py-20 lg:py-28" aria-label="How it works">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 mb-3">
                  Actionable Journey
                </Badge>
                <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                  From uncertainty to a <span className="gradient-text">clear next step.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  LakshyaAI turns your career information into a structured, personalized action plan.
                </p>
              </div>

              {/* 4 Connected Cards with Animated Connector */}
              <div className="relative mt-14">
                {/* Desktop subtle connecting line */}
                <div className="absolute top-1/2 left-8 right-8 hidden h-0.5 -translate-y-1/2 bg-gradient-to-r from-primary/30 via-accent/30 to-teal-400/30 lg:block z-0" />

                <div className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {JOURNEY_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.number}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                      >
                        <GlowCard className="glass-card glass-card-hover flex h-full flex-col justify-between rounded-xl border border-white/10 p-6 shadow-md">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className="font-display text-2xl font-black text-primary/30">{step.number}</span>
                            </div>
                            <h3 className="mt-5 text-base font-bold text-foreground">{step.title}</h3>
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                          </div>
                        </GlowCard>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              5. THREE CAREER INTELLIGENCE PILLARS
          ========================================== */}
          <section id="pillars" className="relative border-t border-border/50 bg-secondary/10 py-20 lg:py-28" aria-label="Pillars">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                  A complete <span className="gradient-text">career intelligence</span> system.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Three unified pillars designed to help you analyze, prepare, and advance.
                </p>
              </div>

              {/* 3 Pillars Grid with Interactive Focus Damping */}
              <div className="mt-14 grid gap-8 lg:grid-cols-3">
                {PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  const isHovered = hoveredPillar === pillar.pillar;
                  const isOtherHovered = hoveredPillar !== null && !isHovered;

                  return (
                    <motion.div
                      key={pillar.pillar}
                      initial={{ opacity: 0, y: 25 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      onMouseEnter={() => setHoveredPillar(pillar.pillar)}
                      onMouseLeave={() => setHoveredPillar(null)}
                      animate={{
                        opacity: isOtherHovered ? 0.85 : 1,
                        y: isHovered ? -4 : 0,
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      <GlowCard
                        glowColor={pillar.glowColor}
                        className={`glass-card group flex h-full flex-col justify-between rounded-2xl border border-white/10 p-7 transition-all duration-300 ${pillar.borderColor} ${pillar.bgGlow}`}
                      >
                        <div>
                          {/* Pillar Header */}
                          <div className="flex items-center justify-between">
                            <Badge className={`text-[10px] font-bold uppercase tracking-wider ${pillar.badgeClass}`}>
                              {pillar.badge}
                            </Badge>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 ${pillar.accentColor}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>

                          <h3 className="mt-4 font-display text-xl font-bold text-foreground">{pillar.title}</h3>
                          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>

                          {/* Features List */}
                          <div className="mt-6 space-y-3 border-t border-border/50 pt-5">
                            {pillar.features.map((feat) => (
                              <div key={feat.title} className="flex items-start gap-2.5">
                                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${pillar.accentColor}`} />
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground">{feat.title}</h4>
                                  <p className="text-[11px] text-muted-foreground leading-normal">{feat.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setSelectedPillarModal(pillar)}
                            className="inline-flex items-center text-xs font-semibold text-primary transition-colors hover:underline"
                          >
                            {pillar.ctaText} <ChevronRight className="ml-1 h-3 w-3" />
                          </button>
                        </div>
                      </GlowCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ==========================================
              6. AI WORKSPACE / DASHBOARD PREVIEW
          ========================================== */}
          <section id="preview" className="relative py-20 lg:py-28 overflow-hidden" aria-label="Workspace Preview">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                  One workspace. Your <span className="gradient-text">entire career journey.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Track your progress, understand your readiness, discover opportunities, and focus on what matters next.
                </p>
              </div>

              {/* Large Desktop Dashboard Preview Mockup */}
              <motion.div
                ref={previewRef}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
                className="glass-card glow-primary relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-white/15 p-4 shadow-2xl backdrop-blur-2xl sm:p-6"
              >
                {/* Mock Window Top Bar */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs font-medium text-foreground">● LakshyaAI Career Workspace</span>
                  </div>
                  <div className="text-xs text-muted-foreground">app.lakshyaai.com/dashboard</div>
                </div>

                {/* Mock App Body */}
                <div className="mt-4 grid grid-cols-12 gap-4">
                  {/* Mock Sidebar */}
                  <div className="col-span-3 hidden rounded-xl border border-border/40 bg-secondary/30 p-3 md:block">
                    <div className="space-y-1.5 text-xs font-medium">
                      <div className="flex items-center gap-2 rounded-lg bg-primary/20 px-2.5 py-1.5 text-foreground font-semibold">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" />
                        Overview
                      </div>
                      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <FileCheck className="h-3.5 w-3.5" />
                        Resume ATS
                      </div>
                      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Target className="h-3.5 w-3.5" />
                        Role Match
                      </div>
                      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Mic className="h-3.5 w-3.5" />
                        Mock Interviews
                      </div>
                      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Briefcase className="h-3.5 w-3.5" />
                        Job Matches
                      </div>
                    </div>
                  </div>

                  {/* Mock Main Content */}
                  <div className="col-span-12 space-y-4 md:col-span-9">
                    {/* Mock Greeting Bar */}
                    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 p-3.5">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Welcome back, Alex 👋</h4>
                        <p className="text-[11px] text-muted-foreground">Your career profile readiness improved by +8% this week.</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[11px]">
                        Target: Full Stack Developer
                      </Badge>
                    </div>

                    {/* 3 Metric Cards with Counting Numbers */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">READINESS</span>
                        <p className="font-display text-lg font-bold text-foreground">{previewReadiness}%</p>
                        <div className="mt-1 h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${previewReadiness}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">ATS BASELINE</span>
                        <p className="font-display text-lg font-bold text-foreground">{previewATS}%</p>
                        <div className="mt-1 h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${previewATS}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-accent"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">INTERVIEW SCORE</span>
                        <p className="font-display text-lg font-bold text-foreground">{previewInterview}%</p>
                        <div className="mt-1 h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${previewInterview}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-emerald-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recommended Next Steps */}
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5">
                      <span className="text-xs font-semibold text-foreground">Recommended Next Steps</span>
                      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2 transition-colors hover:bg-card">
                          <span className="flex items-center gap-2 text-foreground font-medium">
                            <Mic className="h-3.5 w-3.5 text-primary" /> Practice System Design Voice Interview
                          </span>
                          <span
                            onClick={() => navigate("/register")}
                            className="cursor-pointer text-xs text-primary font-semibold hover:underline"
                          >
                            Start →
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2 transition-colors hover:bg-card">
                          <span className="flex items-center gap-2 text-foreground font-medium">
                            <Brain className="h-3.5 w-3.5 text-accent" /> Review Docker & CI/CD Skill Modules
                          </span>
                          <span
                            onClick={() => navigate("/register")}
                            className="cursor-pointer text-xs text-accent font-semibold hover:underline"
                          >
                            View →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ==========================================
              7. FINAL CALL TO ACTION
          ========================================== */}
          <section className="relative py-20 lg:py-28" aria-label="Call to action">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <GlowCard
                glowColor="rgba(147, 51, 234, 0.14)"
                className="glass-card glow-primary rounded-3xl border border-white/15 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-14"
              >
                <div className="mx-auto max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>✦ Start Free Today</span>
                  </div>

                  <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-5xl leading-tight">
                    Your career deserves <br />
                    <span className="gradient-text">more than guesswork.</span>
                  </h2>

                  <p className="text-sm text-muted-foreground sm:text-base leading-relaxed">
                    Start with a clearer understanding of your skills, goals, and opportunities — then build a smarter path forward with LakshyaAI.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <MagneticButton>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:opacity-95 hover:shadow-primary/50"
                        asChild
                      >
                        <Link to="/register">
                          Start My Career Journey
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </MagneticButton>

                    <Button variant="outline" size="lg" className="w-full sm:w-auto border-border/80 transition-colors hover:bg-secondary/60" asChild>
                      <Link to="/login">Sign In to Your Workspace</Link>
                    </Button>
                  </div>
                </div>
              </GlowCard>
            </div>
          </section>
        </main>

        {/* ==========================================
            8. FOOTER
        ========================================== */}
        <footer className="border-t border-border/50 bg-background/80 py-12" role="contentinfo">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-4">
              {/* Brand Column */}
              <div className="space-y-3 md:col-span-2">
                <Link to="/" className="inline-flex items-center gap-2" aria-label="LakshyaAI home">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background">
                      <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </div>
                  <span className="font-display text-xl font-bold gradient-text">LakshyaAI</span>
                </Link>
                <p className="max-w-sm text-xs text-muted-foreground leading-relaxed">
                  AI-powered career intelligence for clearer decisions and smarter growth.
                </p>
              </div>

              {/* Product Navigation */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">PRODUCT</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>
                    <Link to="/register" className="hover:text-foreground transition-colors">
                      Resume Intelligence
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-foreground transition-colors">
                      Role Readiness
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-foreground transition-colors">
                      AI Interviews
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-foreground transition-colors">
                      Career Analytics
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Platform Navigation */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">PLATFORM</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>
                    <button
                      onClick={() => scrollToSection("how-it-works")}
                      className="hover:text-foreground transition-colors text-left"
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("preview")}
                      className="hover:text-foreground transition-colors text-left"
                    >
                      Workspace
                    </button>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-foreground transition-colors">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-foreground transition-colors">
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
              © 2026 LakshyaAI. All rights reserved.
            </div>
          </div>
        </footer>

        {/* ==========================================
            INTERACTIVE PILLAR EXPLORATION MODAL
        ========================================== */}
        <Dialog open={!!selectedPillarModal} onOpenChange={(open) => !open && setSelectedPillarModal(null)}>
          <DialogContent className="glass-card border-white/15 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg">
            {selectedPillarModal && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Badge className={`text-[10px] font-bold uppercase tracking-wider ${selectedPillarModal.badgeClass}`}>
                      {selectedPillarModal.badge}
                    </Badge>
                  </div>
                  <DialogTitle className="font-display text-xl font-bold text-foreground">
                    {selectedPillarModal.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {selectedPillarModal.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="my-3 space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Included Capabilities</h4>
                  <div className="space-y-2">
                    {selectedPillarModal.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${selectedPillarModal.accentColor}`} />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between pt-2 border-t border-border/40">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">
                      Close
                    </Button>
                  </DialogClose>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-accent text-white"
                    onClick={() => {
                      setSelectedPillarModal(null);
                      navigate("/register");
                    }}
                  >
                    Start Free Journey <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
