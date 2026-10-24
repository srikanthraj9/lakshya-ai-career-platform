import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Target,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Map,
  Lock,
  Bell,
  Sparkles,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Briefcase,
  GraduationCap,
  Settings,
  Eye,
  Sliders,
  Check,
  RefreshCw,
  KeyRound,
  Pencil,
  Save,
  X,
  Compass,
  Trash2,
  AlertOctagon,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CareerActivityTimeline } from "@/components/activity/CareerActivityTimeline";
import { useCareerContext } from "@/hooks/useCareerContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { profileService, type UserProfileData, type UserSettingsData } from "@/services/profileService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsCategory =
  | "personal"
  | "career"
  | "security"
  | "privacy"
  | "notifications"
  | "appearance";

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "settings" ? "settings" : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "activity">(initialTab);
  const [activeSettingsCategory, setActiveSettingsCategory] = useState<SettingsCategory>("personal");

  const { user, refreshUser, logout } = useAuth();
  const { targetRole, setTargetRole, readiness, detectedSkills, missingSkills } = useCareerContext();
  const { addNotification } = useNotifications();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Profile State
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [college, setCollege] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [workPreference, setWorkPreference] = useState("Remote / Hybrid");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Intermediate");

  // Inline About edit
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Self-Service Account Deletion State
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionToken, setDeletionToken] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);

  const authProvider = profile?.auth_provider || (user as any)?.auth_provider || "password";

  const handleOpenDeleteDialog = async () => {
    setDeleteConfirmationInput("");
    setDeletePasswordInput("");
    setDeleteError(null);
    setDeletionToken(null);
    setDeleteDialogOpen(true);

    if (authProvider === "google") {
      setIsFetchingToken(true);
      try {
        const tokenRes = await profileService.getDeletionToken();
        setDeletionToken(tokenRes.deletion_token);
      } catch (err: any) {
        setDeleteError(
          err?.response?.data?.detail || "Failed to initialize secure deletion token. Please try again."
        );
      } finally {
        setIsFetchingToken(false);
      }
    }
  };

  const handleRefreshDeletionToken = async () => {
    setIsFetchingToken(true);
    setDeleteError(null);
    try {
      const tokenRes = await profileService.getDeletionToken();
      setDeletionToken(tokenRes.deletion_token);
      toast.success("New deletion authorization token issued (valid for 5 minutes).");
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.detail || "Failed to refresh deletion authorization token."
      );
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleConfirmAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationInput.trim() !== "DELETE") {
      setDeleteError("You must type 'DELETE' in uppercase to confirm permanent deletion.");
      return;
    }

    if (authProvider === "password" && !deletePasswordInput.trim()) {
      setDeleteError("Current account password is required to verify ownership.");
      return;
    }

    if (authProvider === "google" && !deletionToken) {
      setDeleteError("A valid deletion authorization token is required. Please generate a token to proceed.");
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      const res = await profileService.deleteAccount({
        confirmation: deleteConfirmationInput.trim(),
        password: authProvider === "password" ? deletePasswordInput.trim() : undefined,
        deletion_token: authProvider === "google" ? deletionToken : undefined,
      });

      toast.success("Account deleted", {
        description: res.message || "Your account has been permanently removed.",
      });

      setDeleteDialogOpen(false);

      // Purge client storage and cache
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      // Logout and redirect to landing
      logout();
      navigate("/");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to delete account. Please verify your credentials and try again.";
      setDeleteError(errorMsg);
      toast.error("Account deletion failed", { description: errorMsg });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Load Profile & Settings
  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileData, settingsData] = await Promise.all([
        profileService.getProfile(),
        profileService.getSettings(),
      ]);
      setProfile(profileData);
      setSettings(settingsData);

      // Populate form fields
      setFullName(profileData.full_name || user?.full_name || "");
      setHeadline(profileData.headline || `Aspiring ${profileData.target_role || targetRole || "Software Engineer"}`);
      setBio(profileData.bio || "");
      setLocation(profileData.location || "");
      setCollege(profileData.college || "");
      setEducationLevel(profileData.education_level || "Bachelor's Degree");
      setGraduationYear(profileData.graduation_year || "2025");
      setPortfolioUrl(profileData.portfolio_url || "");
      setLinkedinUrl(profileData.linkedin_url || "");
      setGithubUrl(profileData.github_url || "");
      setWorkPreference(profileData.work_preference || "Remote / Hybrid");
      setEmploymentType(profileData.employment_type || "Full-time");
      setExperienceLevel(profileData.experience_level || "Mid-Level");
    } catch {
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Profile Updates
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile({
        full_name: fullName,
        headline,
        bio,
        location,
        college,
        education_level: educationLevel,
        graduation_year: graduationYear,
        portfolio_url: portfolioUrl,
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        work_preference: workPreference,
        employment_type: employmentType,
        experience_level: experienceLevel,
        target_role: targetRole,
      });

      setProfile(updated);
      setIsEditingAbout(false);
      toast.success("Profile updated successfully");
      addNotification(
        "profile_milestone",
        "Profile Updated",
        "Your professional career profile details have been saved.",
        "/profile",
        "View Profile"
      );
      if (refreshUser) {
        refreshUser();
      }
    } catch {
      toast.error("Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Settings Updates
  const handleSaveSettings = async (updates: Partial<UserSettingsData>) => {
    try {
      const updated = await profileService.updateSettings(updates);
      setSettings(updated);
      toast.success("Preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    const source = (name || email || "User").trim();
    const parts = source.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  const completeness = profile?.profile_completeness ?? 70;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Master LinkedIn-Style Identity Card */}
        <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-display text-xl sm:text-2xl font-bold shadow-lg shadow-primary/25 border border-white/20">
                {getInitials(fullName, user?.email)}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                    {fullName || "Candidate"}
                  </h1>
                  <StatusBadge variant="success" dot className="text-[10px]">
                    Verified Account
                  </StatusBadge>
                  {user?.is_email_verified && (
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Email Verified
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground truncate font-medium">
                  {headline}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    {targetRole}
                  </span>
                  {location && (
                    <>
                      <span>•</span>
                      <span>{location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Actions: Edit / Settings */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <Button
                onClick={() => {
                  setActiveTab("settings");
                  setActiveSettingsCategory("personal");
                }}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 border-border/80 h-9"
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span>Edit Profile</span>
              </Button>

              <Link to="/skills">
                <Button
                  variant="gradient"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 h-9 font-semibold text-white shadow-md shadow-primary/20"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Skill Passport</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile Completeness Progress Bar */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Profile Completeness</span>
              </div>
              <span className="font-bold text-primary">{completeness}% Complete</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {completeness < 100 && (
              <p className="text-[11px] text-muted-foreground">
                Tip: Complete your portfolio links and add 5+ skills to reach 100% profile strength.
              </p>
            )}
          </div>
        </div>

        {/* Master Navigation Tabs */}
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/30 p-1.5 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
              activeTab === "overview"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Professional Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
              activeTab === "settings"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings & Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
              activeTab === "activity"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Career History</span>
          </button>
        </div>

        {/* Tab 1: Professional Profile (LinkedIn Inspired) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left Column (2 Cols): About, Education, Projects */}
              <div className="md:col-span-2 space-y-6">
                {/* About / Professional Summary */}
                <div className="glass-card rounded-3xl p-6 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        About & Professional Summary
                      </h3>
                    </div>
                    {!isEditingAbout ? (
                      <Button
                        onClick={() => setIsEditingAbout(true)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => setIsEditingAbout(false)}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          variant="gradient"
                          size="sm"
                          className="h-7 text-xs text-white"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          <span>Save</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingAbout ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Write a brief professional summary of your background, technical focus, and career ambitions..."
                      rows={4}
                      className="w-full rounded-2xl bg-secondary/30 border border-border p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {bio ||
                        `Driven ${experienceLevel} engineer specializing in modern software development and cloud architectures. Currently advancing readiness toward the ${targetRole} benchmark.`}
                    </p>
                  )}
                </div>

                {/* Core Skills & Expertise (Linked to Skill Passport) */}
                <div className="glass-card rounded-3xl p-6 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Skills & Competencies ({detectedSkills.length})
                      </h3>
                    </div>
                    <Link to="/skills">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary"
                      >
                        <span>Manage in Skill Passport</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {detectedSkills.slice(0, 12).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Education & Academic Background */}
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">Education</h3>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        {college || "University / College"}
                      </h4>
                      <p className="text-xs text-muted-foreground">{educationLevel}</p>
                      <p className="text-[11px] text-muted-foreground/80">Class of {graduationYear}</p>
                    </div>
                  </div>
                </div>

                {/* Portfolio & External Profiles */}
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Portfolio & Online Profiles
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {portfolioUrl ? (
                      <a
                        href={portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-secondary/30 border border-border/60 hover:border-primary/40 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          Portfolio
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <span className="p-3 rounded-2xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground text-center">
                        No portfolio linked
                      </span>
                    )}

                    {githubUrl ? (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-secondary/30 border border-border/60 hover:border-primary/40 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Github className="h-3.5 w-3.5 text-foreground" />
                          GitHub
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <span className="p-3 rounded-2xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground text-center">
                        No GitHub linked
                      </span>
                    )}

                    {linkedinUrl ? (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-secondary/30 border border-border/60 hover:border-primary/40 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                          LinkedIn
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <span className="p-3 rounded-2xl bg-secondary/20 border border-border/40 text-xs text-muted-foreground text-center">
                        No LinkedIn linked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (1 Col): Career Health & Preferences */}
              <div className="space-y-6">
                {/* Career Readiness Breakdown */}
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Readiness Benchmark
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-primary">
                      {readiness.overallScore}% Overall
                    </span>
                  </div>

                  <div className="space-y-3 pt-1 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>ATS Resume Score</span>
                        <span className="font-semibold text-foreground">
                          {readiness.resumeHealth ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${readiness.resumeHealth ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Role Skill Alignment</span>
                        <span className="font-semibold text-foreground">
                          {readiness.roleMatch ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${readiness.roleMatch ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Interview Performance</span>
                        <span className="font-semibold text-foreground">
                          {readiness.interviewReadiness ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${readiness.interviewReadiness ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Career Preferences Summary */}
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Career Preferences
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Target Role</span>
                      <span className="font-semibold text-foreground">{targetRole}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Work Mode</span>
                      <span className="font-semibold text-foreground">{workPreference}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Employment Type</span>
                      <span className="font-semibold text-foreground">{employmentType}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Experience Level</span>
                      <span className="font-semibold text-foreground">{experienceLevel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Settings & Preferences (6 Categories) */}
        {activeTab === "settings" && (
          <div className="grid gap-6 md:grid-cols-4 items-start">
            {/* Settings Categories Navigation (Horizontal scroll on mobile, vertical sidebar on desktop) */}
            <div className="glass-card rounded-3xl p-2.5 md:p-3 flex md:flex-col overflow-x-auto gap-1.5 md:gap-1 md:col-span-1 scrollbar-none">
              {[
                { id: "personal" as const, label: "Personal Information", icon: User },
                { id: "career" as const, label: "Career Preferences", icon: Target },
                { id: "security" as const, label: "Account & Security", icon: Lock },
                { id: "privacy" as const, label: "Privacy & Visibility", icon: Eye },
                { id: "notifications" as const, label: "Notifications", icon: Bell },
                { id: "appearance" as const, label: "Appearance & Theme", icon: Sliders },
              ].map((cat) => {
                const isActive = activeSettingsCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveSettingsCategory(cat.id)}
                    className={cn(
                      "shrink-0 md:w-full flex items-center gap-2 rounded-2xl px-3 py-2 md:px-3.5 md:py-2.5 text-xs font-medium transition-all text-left whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <cat.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Settings Content */}
            <div className="glass-card rounded-3xl p-6 md:col-span-3 space-y-6">
              {/* Category 1: Personal Information */}
              {activeSettingsCategory === "personal" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Personal Information
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Update your identity, contact coordinates, and professional headline
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Professional Headline</Label>
                      <Input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Full Stack Engineer | React, Node.js & Cloud Architecture"
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Location</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Bengaluru, India or San Francisco, CA"
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                      <Input
                        value={user?.email || ""}
                        disabled
                        className="rounded-xl text-xs h-9 bg-secondary/20 border-border/50 text-muted-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Email is authenticated via Lakshya AI identity services.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        variant="gradient"
                        size="sm"
                        className="rounded-xl text-xs font-semibold text-white shadow-md"
                      >
                        {isSaving ? "Saving..." : "Save Personal Info"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 2: Career Preferences */}
              {activeSettingsCategory === "career" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Career Preferences
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Define your target role, work conditions, and experience level
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Target Role</Label>
                      <Input
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Work Mode Preference</Label>
                      <select
                        value={workPreference}
                        onChange={(e) => setWorkPreference(e.target.value)}
                        className="w-full rounded-xl text-xs h-9 bg-secondary/30 border border-border px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Remote">Remote Only</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote / Hybrid">Remote / Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Employment Type</Label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full rounded-xl text-xs h-9 bg-secondary/30 border border-border px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Experience Level</Label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full rounded-xl text-xs h-9 bg-secondary/30 border border-border px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Entry-Level / Graduate">Entry-Level / Graduate</option>
                        <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                        <option value="Senior">Senior (5-8 yrs)</option>
                        <option value="Staff / Lead">Staff / Lead (8+ yrs)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        variant="gradient"
                        size="sm"
                        className="rounded-xl text-xs font-semibold text-white shadow-md"
                      >
                        {isSaving ? "Saving..." : "Save Career Preferences"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 3: Account & Security */}
              {activeSettingsCategory === "security" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Account & Security
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Update your password and review active account authentication status
                    </p>
                  </div>

                  {/* Change Password Form */}
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-2 pb-1 text-xs font-semibold text-foreground">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <span>Change Account Password</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Current Password</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="rounded-xl text-xs h-9 bg-secondary/30"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      variant="gradient"
                      size="sm"
                      className="rounded-xl text-xs font-semibold text-white shadow-md"
                    >
                      {isChangingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </form>

                  {/* Sign Out Action */}
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">Active Session</p>
                      <p className="text-[11px] text-muted-foreground">
                        Sign out of Lakshya AI on this device
                      </p>
                    </div>
                    <Button
                      onClick={logout}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Sign Out
                    </Button>
                  </div>

                  {/* Danger Zone: Permanent Account Deletion */}
                  <div className="pt-6 border-t border-destructive/20 space-y-3">
                    <div className="flex items-center gap-2 text-rose-500">
                      <AlertOctagon className="h-4 w-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h4>
                    </div>

                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Delete Account</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Permanently remove your Lakshya AI account and all associated personal records.
                          This includes your career intelligence profiles, verified skills, Skill Passport links,
                          uploaded resume documents, interview evaluations, application tracker entries,
                          and roadmaps. <strong>This action is immediate and cannot be undone.</strong>
                        </p>
                      </div>

                      <div className="pt-1">
                        <Button
                          type="button"
                          onClick={handleOpenDeleteDialog}
                          variant="destructive"
                          size="sm"
                          className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete My Account</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 4: Privacy & Visibility */}
              {activeSettingsCategory === "privacy" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Privacy & Visibility Controls
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Control public access to your Skill Passport and personalization analytics
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/60">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Skill Passport Public Sharing</p>
                        <p className="text-[11px] text-muted-foreground">
                          {profile?.is_public_passport
                            ? "Passport is accessible to anyone with your secure link"
                            : "Private: Only you can view your Skill Passport"}
                        </p>
                      </div>
                      <Link to="/skills">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                          Manage in Passport
                        </Button>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/60">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Personalized AI Insights</p>
                        <p className="text-[11px] text-muted-foreground">
                          Allow Lakshya AI to generate role recommendations based on your resume and skills
                        </p>
                      </div>
                      <Switch
                        checked={settings?.privacy_settings?.personalized_recommendations ?? true}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            privacy_settings: {
                              ...settings?.privacy_settings,
                              personalized_recommendations: checked,
                              passport_public: Boolean(profile?.is_public_passport),
                              analytics_opt_in: settings?.privacy_settings?.analytics_opt_in ?? true,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Category 5: Notifications Preferences */}
              {activeSettingsCategory === "notifications" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Notification Preferences
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Choose which career alerts and milestones you receive in-app and via email
                    </p>
                  </div>

                  <div className="space-y-3 max-w-xl">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/25 border border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">In-App Notifications</p>
                        <p className="text-[10px] text-muted-foreground">
                          Receive live activity alerts in the notification drawer and activity center
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notification_preferences?.in_app_enabled ?? true}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            notification_preferences: {
                              ...settings?.notification_preferences,
                              in_app_enabled: checked,
                              email_enabled: settings?.notification_preferences?.email_enabled ?? false,
                              job_matches: settings?.notification_preferences?.job_matches ?? true,
                              interview_reminders: settings?.notification_preferences?.interview_reminders ?? true,
                              roadmap_reminders: settings?.notification_preferences?.roadmap_reminders ?? true,
                              career_insights: settings?.notification_preferences?.career_insights ?? true,
                              weekly_summary: settings?.notification_preferences?.weekly_summary ?? false,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/25 border border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Job Match Notifications</p>
                        <p className="text-[10px] text-muted-foreground">
                          Notify me when high-compatibility job openings match my profile
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notification_preferences?.job_matches ?? true}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            notification_preferences: {
                              ...settings?.notification_preferences,
                              in_app_enabled: settings?.notification_preferences?.in_app_enabled ?? true,
                              email_enabled: settings?.notification_preferences?.email_enabled ?? false,
                              job_matches: checked,
                              interview_reminders: settings?.notification_preferences?.interview_reminders ?? true,
                              roadmap_reminders: settings?.notification_preferences?.roadmap_reminders ?? true,
                              career_insights: settings?.notification_preferences?.career_insights ?? true,
                              weekly_summary: settings?.notification_preferences?.weekly_summary ?? false,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/25 border border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Interview Studio Updates</p>
                        <p className="text-[10px] text-muted-foreground">
                          Alerts when mock interview evaluations and feedback reports are generated
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notification_preferences?.interview_reminders ?? true}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            notification_preferences: {
                              ...settings?.notification_preferences,
                              in_app_enabled: settings?.notification_preferences?.in_app_enabled ?? true,
                              email_enabled: settings?.notification_preferences?.email_enabled ?? false,
                              job_matches: settings?.notification_preferences?.job_matches ?? true,
                              interview_reminders: checked,
                              roadmap_reminders: settings?.notification_preferences?.roadmap_reminders ?? true,
                              career_insights: settings?.notification_preferences?.career_insights ?? true,
                              weekly_summary: settings?.notification_preferences?.weekly_summary ?? false,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/25 border border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Career Roadmap Reminders</p>
                        <p className="text-[10px] text-muted-foreground">
                          Progress checks on active learning milestones
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notification_preferences?.roadmap_reminders ?? true}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            notification_preferences: {
                              ...settings?.notification_preferences,
                              in_app_enabled: settings?.notification_preferences?.in_app_enabled ?? true,
                              email_enabled: settings?.notification_preferences?.email_enabled ?? false,
                              job_matches: settings?.notification_preferences?.job_matches ?? true,
                              interview_reminders: settings?.notification_preferences?.interview_reminders ?? true,
                              roadmap_reminders: checked,
                              career_insights: settings?.notification_preferences?.career_insights ?? true,
                              weekly_summary: settings?.notification_preferences?.weekly_summary ?? false,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Category 6: Appearance & Accessibility */}
              {activeSettingsCategory === "appearance" && (
                <div className="space-y-5">
                  <div className="space-y-1 pb-3 border-b border-border/50">
                    <h3 className="font-display text-base font-bold text-foreground">
                      Appearance & Accessibility
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tailor visual theme and motion ergonomics for your workstation
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/60">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">Reduced Motion</p>
                        <p className="text-[11px] text-muted-foreground">
                          Minimize animated transitions and decorative transforms
                        </p>
                      </div>
                      <Switch
                        checked={settings?.appearance_settings?.reduced_motion ?? false}
                        onCheckedChange={(checked) =>
                          handleSaveSettings({
                            appearance_settings: {
                              ...settings?.appearance_settings,
                              theme: settings?.appearance_settings?.theme || "dark",
                              reduced_motion: checked,
                              compact_mode: settings?.appearance_settings?.compact_mode ?? false,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Career Activity History */}
        {activeTab === "activity" && (
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="space-y-1 pb-3 border-b border-border/50">
              <h3 className="font-display text-base font-bold text-foreground">
                Career Activity Timeline
              </h3>
              <p className="text-xs text-muted-foreground">
                Chronological ledger of milestones, resume revisions, and interview evaluations
              </p>
            </div>
            <CareerActivityTimeline />
          </div>
        )}
      </div>

      {/* Permanent Account Deletion Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-destructive/30 bg-background/95 backdrop-blur-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2.5 text-rose-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/25 shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Permanently Delete Account?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  This action is irreversible and immediately wipes all user-owned records.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirmAccountDeletion} className="space-y-4 pt-2">
            {/* Dependency inventory and categories explained to user */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 space-y-2 text-[11px] text-muted-foreground">
              <p className="font-semibold text-rose-400">
                The following personal data categories will be permanently destroyed:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-foreground/80">
                <li>Professional profile, headline, bio, and career preferences</li>
                <li>All verified skills and public Skill Passport share URLs (immediately revoked)</li>
                <li>Uploaded resume PDFs and AI-generated rewrite documents from storage</li>
                <li>AI interview recordings, speech transcripts, and STAR evaluations</li>
                <li>Job applications, outreach messages, and interview debrief logs</li>
                <li>Learning roadmap milestones, progress tracking, and career goals</li>
                <li>In-app notification records and Career Copilot chat histories</li>
              </ul>
            </div>

            {/* Re-authentication: Password verification for password accounts vs OAuth Token */}
            {authProvider === "password" ? (
              <div className="space-y-1.5">
                <Label htmlFor="delete-account-password" className="text-xs font-semibold text-foreground">
                  Current Account Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delete-account-password"
                  type="password"
                  value={deletePasswordInput}
                  onChange={(e) => setDeletePasswordInput(e.target.value)}
                  placeholder="Enter your current password"
                  className="rounded-xl text-xs h-9 bg-secondary/30 border-border/80"
                  required
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Google Sign-In Account ({user?.email || profile?.email})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                    Google OAuth
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This account signs in using Google. Lakshya AI will never ask for your Google password. Authorization is verified via a secure, short-lived, single-use deletion token.
                </p>
                {isFetchingToken ? (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Issuing secure deletion authorization token...</span>
                  </div>
                ) : deletionToken ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Authorization token active (valid for 5m)
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshDeletionToken}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Refresh token
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-amber-400">Authorization token not active</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshDeletionToken}
                      className="h-7 text-xs rounded-lg"
                    >
                      Generate Token
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Explicit confirmation phrase */}
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirmation-text" className="text-xs font-semibold text-foreground">
                Type <strong className="text-destructive font-mono">DELETE</strong> to confirm permanent deletion:
              </Label>
              <Input
                id="delete-confirmation-text"
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="rounded-xl text-xs h-9 font-mono tracking-wider bg-secondary/30 border-destructive/40 focus:border-destructive"
                required
                autoComplete="off"
              />
            </div>

            {/* Actionable Error Display */}
            {deleteError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span>{deleteError}</span>
              </div>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeletingAccount}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={
                  isDeletingAccount ||
                  isFetchingToken ||
                  deleteConfirmationInput.trim() !== "DELETE" ||
                  (authProvider === "password" && !deletePasswordInput.trim()) ||
                  (authProvider === "google" && !deletionToken)
                }
                className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
