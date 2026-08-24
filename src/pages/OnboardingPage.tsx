import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { onboardingService } from "@/services/onboarding";
import { resumeService } from "@/services/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Target,
  Brain,
  Mic,
  Briefcase,
  GraduationCap,
  Award,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  Loader2,
  Compass,
  FileText,
  Search,
  CheckCircle2,
  TrendingUp,
  Layers,
  Sparkle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getApiErrorMessage } from "@/services/api";

const GOAL_OPTIONS = [
  {
    id: "Improve my resume",
    icon: FileText,
    title: "Improve My Resume",
    desc: "Boost ATS score, fix formatting, and optimize bullet points with AI.",
  },
  {
    id: "Find the right career path",
    icon: Target,
    title: "Find the Right Career Path",
    desc: "Discover tech roles that best match my background and interests.",
  },
  {
    id: "Prepare for jobs",
    icon: TrendingUp,
    title: "Prepare for Jobs",
    desc: "Build structured career roadmaps and track milestone progression.",
  },
  {
    id: "Practice interviews",
    icon: Mic,
    title: "Practice Interviews",
    desc: "Simulate text and voice AI technical and behavioral interviews.",
  },
  {
    id: "Identify my skill gaps",
    icon: Brain,
    title: "Identify Skill Gaps",
    desc: "Benchmark my skills against industry standards and job descriptions.",
  },
  {
    id: "Discover job opportunities",
    icon: Briefcase,
    title: "Discover Jobs",
    desc: "Receive semantic job recommendations tailored to my profile.",
  },
];

const CAREER_STAGES = [
  {
    id: "Student",
    title: "Student",
    subtitle: "Currently enrolled in college or university.",
    icon: GraduationCap,
  },
  {
    id: "Fresher / Recent Graduate",
    title: "Fresher / Recent Graduate",
    subtitle: "Graduated recently, looking for entry-level roles.",
    icon: Award,
  },
  {
    id: "Working Professional",
    title: "Working Professional",
    subtitle: "Currently employed, seeking promotion or lateral switch.",
    icon: Briefcase,
  },
  {
    id: "Career Switcher",
    title: "Career Switcher",
    subtitle: "Transitioning into tech or software from another domain.",
    icon: Layers,
  },
  {
    id: "Experienced Professional",
    title: "Experienced Professional",
    subtitle: "Senior engineer or specialist targeting leadership peaks.",
    icon: Sparkles,
  },
];

const EDUCATION_LEVELS = [
  "High School",
  "Diploma",
  "Bachelor's Degree (B.Tech / B.E. / B.S. / B.C.A.)",
  "Master's Degree (M.Tech / M.S. / M.C.A. / M.B.A.)",
  "Doctorate / Ph.D.",
  "Self-Taught / Bootcamp / Other",
];

const POPULAR_SPECIALIZATIONS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Data Science & AI",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Business & Commerce",
  "Other / Multidisciplinary",
];

const EXPERIENCE_LEVELS = [
  { id: "No experience yet", label: "No experience yet (Fresh start)" },
  { id: "Less than 1 year", label: "Less than 1 year (Intern / Junior)" },
  { id: "1–3 years", label: "1 – 3 years (Mid-level)" },
  { id: "3–5 years", label: "3 – 5 years (Experienced)" },
  { id: "5+ years", label: "5+ years (Senior / Lead)" },
];

const DEFAULT_SKILL_CATEGORIES = {
  "Programming Languages": ["Python", "Java", "JavaScript", "TypeScript", "C++", "C", "Go", "Rust", "SQL"],
  "Frontend Development": ["React", "Next.js", "HTML5", "CSS3", "Tailwind CSS", "Vue.js", "Angular", "Redux"],
  "Backend & APIs": ["FastAPI", "Node.js", "Express.js", "Django", "Spring Boot", "Flask", "GraphQL", "REST APIs"],
  "Databases & Storage": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite", "Supabase"],
  "Cloud & DevOps": ["Docker", "Kubernetes", "AWS", "Git", "GitHub", "CI/CD", "Linux", "Azure"],
  "AI & Data Science": ["Machine Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "NLP"],
};

const POPULAR_ROLES = [
  "Full Stack Developer",
  "Software Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Machine Learning Engineer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "Cloud Architect",
  "UI/UX Designer",
];

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const { user, refreshUser, isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingStep, setSavingStep] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Onboarding Form State Hooks
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [careerStage, setCareerStage] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [specialization, setSpecialization] = useState<string>("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [college, setCollege] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [targetRole, setTargetRole] = useState<string>("");
  const [isExploringRoles, setIsExploringRoles] = useState<boolean>(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState<string>("");
  const [skillSearchQuery, setSkillSearchQuery] = useState<string>("");
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [resumeUploadedSuccess, setResumeUploadedSuccess] = useState<boolean>(false);

  // Auth guard checks
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isEmailVerified) {
      navigate("/verify-email", { replace: true });
      return;
    }
  }, [isLoading, isAuthenticated, isEmailVerified, navigate]);

  // Load existing onboarding progress from backend
  useEffect(() => {
    async function loadProgress() {
      if (!isAuthenticated || !isEmailVerified) return;

      try {
        setLoadingProfile(true);
        const profile = await onboardingService.getProfile();
        if (profile.onboarding_completed) {
          navigate("/dashboard", { replace: true });
          return;
        }

        if (profile.onboarding_current_step && profile.onboarding_current_step >= 1) {
          setCurrentStep(Math.min(profile.onboarding_current_step, TOTAL_STEPS));
        }
        if (profile.primary_goals?.length) setSelectedGoals(profile.primary_goals);
        if (profile.career_stage) setCareerStage(profile.career_stage);
        if (profile.education_level) setEducationLevel(profile.education_level);
        if (profile.specialization) setSpecialization(profile.specialization);
        if (profile.graduation_year) setGraduationYear(profile.graduation_year);
        if (profile.college) setCollege(profile.college);
        if (profile.experience_level) setExperienceLevel(profile.experience_level);
        if (profile.target_role) setTargetRole(profile.target_role);
        if (profile.is_exploring_roles !== undefined) setIsExploringRoles(profile.is_exploring_roles);
        if (profile.skills?.length) setSelectedSkills(profile.skills);
      } catch (error) {
        console.error("Failed to load onboarding profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProgress();
  }, [isAuthenticated, isEmailVerified, navigate]);


  // Persist Step to Backend
  const persistStep = useCallback(
    async (stepNumber: number) => {
      setSavingStep(true);
      try {
        await onboardingService.saveStep({
          step: stepNumber,
          primary_goals: selectedGoals,
          career_stage: careerStage,
          education_level: educationLevel,
          specialization: specialization,
          graduation_year: graduationYear,
          college: college,
          experience_level: experienceLevel,
          target_role: targetRole,
          is_exploring_roles: isExploringRoles,
          skills: selectedSkills,
        });
      } catch (error) {
        console.error("Failed to auto-save onboarding step:", error);
      } finally {
        setSavingStep(false);
      }
    },
    [
      selectedGoals,
      careerStage,
      educationLevel,
      specialization,
      graduationYear,
      college,
      experienceLevel,
      targetRole,
      isExploringRoles,
      selectedSkills,
    ],
  );

  const handleNext = async () => {
    // Step Validations
    if (currentStep === 1 && selectedGoals.length === 0) {
      toast.error("Please select at least one primary goal to continue.");
      return;
    }
    if (currentStep === 2 && !careerStage) {
      toast.error("Please select your current career stage.");
      return;
    }
    if (currentStep === 3 && !educationLevel) {
      toast.error("Please select your highest education level.");
      return;
    }
    if (currentStep === 4 && !experienceLevel) {
      toast.error("Please select your experience level.");
      return;
    }
    if (currentStep === 5 && selectedSkills.length === 0) {
      toast.error("Please select or add at least one skill.");
      return;
    }
    if (currentStep === 6 && !targetRole && !isExploringRoles) {
      toast.error("Please select a target role or choose 'I'm exploring'.");
      return;
    }

    const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
    setCurrentStep(nextStep);
    await persistStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
  };

  const handleToggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleAddCustomSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
    }
    setCustomSkillInput("");
  };

  // Optional Resume Upload Handler
  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF resume files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    setResumeFile(file);
    setUploadingResume(true);

    try {
      const uploaded = await resumeService.upload(file);
      setResumeUploadedSuccess(true);
      if (uploaded?.skills && Array.isArray(uploaded.skills)) {
        const extractedSkillNames = uploaded.skills
          .map((s) => (typeof s === "string" ? s : s?.skill))
          .filter(Boolean);

        if (extractedSkillNames.length > 0) {
          setSelectedSkills((prev) => {
            const combined = new Set([...prev, ...extractedSkillNames]);
            return Array.from(combined);
          });
        }
      }
      toast.success("Resume uploaded and parsed successfully!");
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(`Resume scan notice: ${message}`);
    } finally {
      setUploadingResume(false);
    }
  };

  // Final Complete Onboarding Submission
  const handleCompleteOnboarding = async () => {
    setCompleting(true);
    try {
      await onboardingService.complete({
        primary_goals: selectedGoals,
        career_stage: careerStage,
        education_level: educationLevel,
        specialization: specialization,
        graduation_year: graduationYear,
        college: college,
        experience_level: experienceLevel,
        target_role: isExploringRoles ? "Exploring Tech Roles" : targetRole,
        is_exploring_roles: isExploringRoles,
        skills: selectedSkills,
      });

      await refreshUser();
      toast.success("Welcome to your LakshyaAI Career Workspace!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message);
    } finally {
      setCompleting(false);
    }
  };

  const firstName = user?.full_name?.split(" ")[0] || "there";

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your personalized onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="animate-float-slow absolute -bottom-40 right-1/4 h-[550px] w-[550px] rounded-full bg-accent/8 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Top Header Bar */}
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold gradient-text">LakshyaAI</span>
            <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Career Onboarding
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {savingStep && (
              <span className="flex items-center gap-1 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}
            <span className="font-semibold text-foreground">Step {currentStep}</span> of {TOTAL_STEPS}
          </div>
        </div>

        {/* Super Admin Quick-Action Banner */}
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-400 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Super Admin Access:</strong> You have full platform administrator privileges.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 text-xs gap-1"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
              <Button
                size="sm"
                className="h-8 bg-amber-500 text-black hover:bg-amber-400 font-semibold text-xs gap-1"
                onClick={() => navigate("/admin")}
              >
                Open Admin Center →
              </Button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary/60">
            <motion.div
              className="bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-card rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          {/* STEP 1: WELCOME & INTENT */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 1: Welcome & Goals
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Welcome, {firstName}! 👋
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  What brings you to LakshyaAI? Select all goals that matter to you.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {GOAL_OPTIONS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  const Icon = goal.icon;
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`glass-card-hover group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-md shadow-primary/20"
                          : "border-border/60 bg-card/40 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                            isSelected ? "bg-primary text-white" : "bg-secondary text-primary"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            isSelected ? "border-primary bg-primary text-white" : "border-border/80"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                      <h2 className="mt-3 text-sm font-semibold text-foreground">{goal.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{goal.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CAREER STAGE */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 2: Career Stage
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Where are you currently in your career?
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  This helps LakshyaAI benchmark your readiness and recommend relevant milestones.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {CAREER_STAGES.map((stage) => {
                  const isSelected = careerStage === stage.id;
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.id}
                      onClick={() => setCareerStage(stage.id)}
                      className={`glass-card-hover group cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-md shadow-primary/20"
                          : "border-border/60 bg-card/40 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isSelected ? "bg-primary text-white" : "bg-secondary text-primary"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-base font-semibold text-foreground">{stage.title}</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">{stage.subtitle}</p>
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            isSelected ? "border-primary bg-primary text-white" : "border-border/80"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: EDUCATION */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 3: Education Background
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Tell us about your education.
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  LakshyaAI calibrates technical suggestions to your academic path.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edu-level" className="text-xs font-semibold uppercase text-muted-foreground">
                    Highest Level of Education *
                  </Label>
                  <select
                    id="edu-level"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/70 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="" disabled>Select Education Level</option>
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-card text-foreground">{lvl}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edu-spec" className="text-xs font-semibold uppercase text-muted-foreground">
                      Field / Specialization
                    </Label>
                    <Input
                      id="edu-spec"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edu-year" className="text-xs font-semibold uppercase text-muted-foreground">
                      Graduation Year
                    </Label>
                    <Input
                      id="edu-year"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="e.g. 2025"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edu-college" className="text-xs font-semibold uppercase text-muted-foreground">
                    College / University (Optional)
                  </Label>
                  <Input
                    id="edu-college"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Stanford University / National Institute of Tech"
                    className="bg-background/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXPERIENCE */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 4: Professional Experience
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  How much professional experience do you have?
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Don't worry about detailed project history yet—we'll capture that later from your resume.
                </p>
              </div>

              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map((exp) => {
                  const isSelected = experienceLevel === exp.id;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => setExperienceLevel(exp.id)}
                      className={`glass-card-hover flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-md shadow-primary/20"
                          : "border-border/60 bg-card/40 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isSelected ? "bg-primary text-white" : "bg-secondary text-primary"
                          }`}
                        >
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{exp.label}</span>
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                          isSelected ? "border-primary bg-primary text-white" : "border-border/80"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: SKILLS */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 5: Skills Inventory
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  What skills do you already have?
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Select your current skills across categories or add your custom tools.
                </p>
              </div>

              {/* Selected Skills Pills */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Selected Skills ({selectedSkills.length})</span>
                  {selectedSkills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSkills([])}
                      className="text-muted-foreground hover:text-destructive text-[11px]"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2 min-h-[36px]">
                  {selectedSkills.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      No skills selected yet. Click skills below or type custom ones.
                    </span>
                  ) : (
                    selectedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="flex items-center gap-1.5 bg-primary/20 text-foreground border-primary/40 px-2.5 py-1 text-xs"
                      >
                        <span>{skill}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleSkill(skill)}
                        />
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Search & Custom Add */}
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="relative sm:col-span-7">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suggested skills..."
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
                <form onSubmit={handleAddCustomSkill} className="flex gap-2 sm:col-span-5">
                  <Input
                    placeholder="Add custom skill"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    className="bg-background/50 text-xs"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="px-3">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </div>

              {/* Categorized Skills Grid */}
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {Object.entries(DEFAULT_SKILL_CATEGORIES).map(([category, skills]) => {
                  const filteredSkills = skills.filter((s) =>
                    s.toLowerCase().includes(skillSearchQuery.toLowerCase()),
                  );
                  if (filteredSkills.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {filteredSkills.map((skill) => {
                          const isSelected = selectedSkills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => handleToggleSkill(skill)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-white shadow-sm shadow-primary/30"
                                  : "border-border/70 bg-card/60 text-foreground hover:border-primary/50 hover:bg-secondary/40"
                              }`}
                            >
                              {skill} {isSelected && "✓"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: TARGET CAREER ROLE */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 6: Target Career
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  What role are you aiming for?
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  LakshyaAI will calculate skill alignment and generate specialized interview & roadmap tracks.
                </p>
              </div>

              {/* Exploring Toggle */}
              <div
                onClick={() => {
                  setIsExploringRoles(!isExploringRoles);
                  if (!isExploringRoles) {
                    setTargetRole("Exploring Tech Roles");
                  }
                }}
                className={`glass-card-hover flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                  isExploringRoles
                    ? "border-primary bg-primary/15 shadow-md shadow-primary/20"
                    : "border-border/60 bg-card/40 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Sparkle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">I'm not sure yet / Exploring Options</h3>
                    <p className="text-xs text-muted-foreground">Let LakshyaAI analyze your skills and recommend the best fit.</p>
                  </div>
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                    isExploringRoles ? "border-primary bg-primary text-white" : "border-border/80"
                  }`}
                >
                  {isExploringRoles && <Check className="h-3 w-3" />}
                </div>
              </div>

              {!isExploringRoles && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Popular Tech Career Roles
                    </Label>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {POPULAR_ROLES.map((role) => {
                        const isSelected = targetRole === role;
                        return (
                          <div
                            key={role}
                            onClick={() => setTargetRole(role)}
                            className={`glass-card-hover flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm font-medium transition-all ${
                              isSelected
                                ? "border-primary bg-primary/20 text-foreground shadow-sm shadow-primary/30"
                                : "border-border/70 bg-card/50 text-foreground hover:border-primary/50"
                            }`}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="custom-role" className="text-xs font-semibold uppercase text-muted-foreground">
                      Or type a custom role
                    </Label>
                    <Input
                      id="custom-role"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Embedded Systems Engineer / Site Reliability Engineer"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: OPTIONAL RESUME UPLOAD */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 7: Resume Scan (Optional)
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Want to give LakshyaAI a head start?
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Upload your resume in PDF format to automatically extract project experience and compute your baseline ATS score.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-border/80 bg-secondary/10 p-8 text-center transition-colors hover:border-primary/50">
                <input
                  type="file"
                  id="resume-upload-input"
                  accept=".pdf"
                  onChange={handleResumeFileChange}
                  className="hidden"
                />

                {uploadingResume ? (
                  <div className="space-y-3 py-6">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-foreground">Parsing and analyzing resume with AI...</p>
                  </div>
                ) : resumeUploadedSuccess ? (
                  <div className="space-y-3 py-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Resume Processed!</h2>
                    <p className="text-xs text-muted-foreground">{resumeFile?.name}</p>
                    <label
                      htmlFor="resume-upload-input"
                      className="inline-block cursor-pointer text-xs font-semibold text-primary hover:underline"
                    >
                      Upload a different PDF
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <label
                        htmlFor="resume-upload-input"
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Click to browse PDF resume
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max file size: 10MB • Standard PDF
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 8: SUMMARY & LAUNCH */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30">
                  Step 8: Ready to Launch
                </Badge>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Your Career Profile Is Ready!
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  LakshyaAI has prepared your personalized workspace, baseline intelligence, and roadmap.
                </p>
              </div>

              {/* Profile Summary Card */}
              <div className="rounded-xl border border-white/10 bg-card/60 p-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Career Stage</span>
                    <p className="font-semibold text-foreground">{careerStage || "Fresher"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Target Role</span>
                    <p className="font-semibold text-foreground">
                      {isExploringRoles ? "Exploring Tech Roles" : targetRole || "Full Stack Developer"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Education</span>
                    <p className="font-semibold text-foreground">
                      {educationLevel?.split("(")[0] || "Bachelor's Degree"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Skills Added</span>
                    <p className="font-semibold text-foreground">{selectedSkills.length} competencies</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground uppercase">Primary Goals</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedGoals.map((g) => (
                      <Badge key={g} variant="outline" className="bg-secondary/40 text-xs">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={savingStep || completing}
                className="border-border/80"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            ) : (
              <div />
            )}

            {currentStep < TOTAL_STEPS ? (
              <div className="flex items-center gap-3">
                {currentStep === 7 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
                      setCurrentStep(nextStep);
                      persistStep(nextStep);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Skip for now →
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={savingStep}
                  className="bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={completing}
                className="bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
              >
                {completing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Workspace...
                  </>
                ) : (
                  <>
                    Go to My Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
