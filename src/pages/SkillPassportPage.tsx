import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  Target,
  Sparkles,
  BookOpen,
  Briefcase,
  Search,
  Copy,
  Check,
  Map,
  FileText,
  Mic,
  Lock,
  Globe,
  RefreshCw,
  X,
  Code,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { profileService, type UserSkillItem, type UserProfileData } from "@/services/profileService";
import { useCareerContext } from "@/hooks/useCareerContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SkillCategoryTab = "all" | "technical" | "tools" | "architecture" | "soft";

export default function SkillPassportPage() {
  const { user } = useAuth();
  const { targetRole, readiness, detectedSkills, missingSkills } = useCareerContext();
  const { addNotification } = useNotifications();

  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryTab, setCategoryTab] = useState<SkillCategoryTab>("all");

  // Add Skill Dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("technical");
  const [newSkillSource, setNewSkillSource] = useState("manual");
  const [newSkillConfidence, setNewSkillConfidence] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Dialog
  const [skillToDelete, setSkillToDelete] = useState<UserSkillItem | null>(null);

  // Share Passport Dialog
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Profile & Skills
  const loadData = async () => {
    setLoading(true);
    try {
      const [skillsData, profileData] = await Promise.all([
        profileService.getUserSkills(),
        profileService.getProfile(),
      ]);
      setSkills(skillsData);
      setProfile(profileData);
      setShareToken(profileData.share_token || null);
      setIsPublic(Boolean(profileData.is_public_passport));
    } catch {
      toast.error("Failed to load Skill Passport data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((item) => {
      const matchesSearch = item.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryTab === "all") return true;
      if (categoryTab === "technical" && (item.skill_category === "technical" || !item.skill_category)) return true;
      if (categoryTab === "tools" && item.skill_category === "tools") return true;
      if (categoryTab === "architecture" && item.skill_category === "architecture") return true;
      if (categoryTab === "soft" && item.skill_category === "soft") return true;
      return false;
    });
  }, [skills, searchQuery, categoryTab]);

  // Evidence Level Breakdown
  const evidenceCounts = useMemo(() => {
    let verifiedCount = 0;
    let projectCount = 0;
    let resumeCount = 0;
    let selfReportedCount = 0;

    (Array.isArray(skills) ? skills : []).forEach((s) => {
      const src = (s.source || "").toLowerCase();
      if (src === "verified" || src === "interview") {
        verifiedCount++;
      } else if (src === "project") {
        projectCount++;
      } else if (src === "resume" || src === "onboarding") {
        resumeCount++;
      } else {
        selfReportedCount++;
      }
    });

    return { verifiedCount, projectCount, resumeCount, selfReportedCount };
  }, [skills]);

  // Handle Add Skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newSkillName.trim();
    if (!cleaned) {
      toast.error("Please enter a skill name");
      return;
    }

    const isDuplicate = skills.some(
      (s) => s.skill_name.toLowerCase() === cleaned.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`"${cleaned}" is already listed in your Skill Passport`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await profileService.addSkill({
        skill_name: cleaned,
        skill_category: newSkillCategory,
        source: newSkillSource,
        confidence: newSkillConfidence,
      });

      setSkills((prev) => [created, ...prev]);
      toast.success(`Skill "${cleaned}" added to your passport`);
      addNotification(
        "skill_added",
        "Skill Added to Passport",
        `You added ${cleaned} (${newSkillCategory}) to your professional Skill Passport.`,
        "/skills",
        "View Passport"
      );

      setNewSkillName("");
      setIsAddOpen(false);
    } catch {
      toast.error("Failed to add skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Skill
  const handleDeleteSkill = async () => {
    if (!skillToDelete) return;
    try {
      await profileService.deleteSkill(skillToDelete.id);
      setSkills((prev) => prev.filter((s) => s.id !== skillToDelete.id));
      toast.success(`Removed "${skillToDelete.skill_name}" from passport`);
      setSkillToDelete(null);
    } catch {
      toast.error("Failed to delete skill");
    }
  };

  // Handle Toggle Public Share
  const handleToggleShare = async () => {
    setIsSharingLoading(true);
    try {
      if (isPublic) {
        await profileService.revokePassportShareToken();
        setIsPublic(false);
        setShareToken(null);
        toast.success("Skill Passport sharing disabled");
      } else {
        const res = await profileService.createPassportShareToken();
        setIsPublic(true);
        setShareToken(res.share_token);
        toast.success("Skill Passport public share link created");
      }
    } catch {
      toast.error("Failed to update sharing settings");
    } finally {
      setIsSharingLoading(false);
    }
  };

  const shareUrl = shareToken
    ? `${window.location.origin}/passport/shared/${shareToken}`
    : "";

  const handleCopyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Public Skill Passport URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    switch (s) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            Verified Credential
          </span>
        );
      case "interview":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
            <Mic className="h-3 w-3" />
            Interview Assessed
          </span>
        );
      case "project":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
            <Code className="h-3 w-3" />
            Project Evidence
          </span>
        );
      case "resume":
      case "onboarding":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            <FileText className="h-3 w-3" />
            Resume Inferred
          </span>
        );
      case "manual":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Self-Reported
          </span>
        );
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header Hero Card */}
        <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-display text-xl sm:text-2xl font-bold shadow-lg shadow-primary/25 border border-white/20">
                <Award className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    Skill Passport
                  </h1>
                  <StatusBadge variant="default" className="text-[10px] border-primary/30 text-primary">
                    Evidence-Based Portfolio
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Your verified, recruiter-ready skills repository. Supported by code projects, resume extractions, and interview simulations.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground font-semibold">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Target: {targetRole}
                  </span>
                  <span>•</span>
                  <span>{skills.length} Total Registered Skills</span>
                </div>
              </div>
            </div>

            {/* Actions: Add Skill + Share */}
            <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
              <Button
                onClick={() => setIsShareOpen(true)}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 border-border/80 h-9"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>Share Passport</span>
              </Button>

              <Button
                onClick={() => setIsAddOpen(true)}
                variant="gradient"
                size="sm"
                className="rounded-xl text-xs gap-1.5 h-9 font-semibold text-white shadow-md shadow-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Skill</span>
              </Button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50 text-xs">
            <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Target Role Match
              </span>
              <p className="font-display text-lg font-bold text-emerald-400">
                {readiness.roleMatch ?? 75}%
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Evidence-Backed
              </span>
              <p className="font-display text-lg font-bold text-cyan-400">
                {evidenceCounts.projectCount + evidenceCounts.verifiedCount}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Resume-Derived
              </span>
              <p className="font-display text-lg font-bold text-blue-400">
                {evidenceCounts.resumeCount}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Self-Reported
              </span>
              <p className="font-display text-lg font-bold text-foreground">
                {evidenceCounts.selfReportedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Role Alignment & Critical Gap Analysis Card */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">
                  Target Role Requirements & Skill Coverage
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparing your passport with industry expectations for {targetRole}
              </p>
            </div>
            <Link to="/roadmap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Map className="h-3.5 w-3.5" />
                <span>View Learning Roadmap</span>
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Matched Core Skills */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Demonstrated Core Skills ({detectedSkills.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {detectedSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-medium text-emerald-300"
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Identified Skill Gaps */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Identified Priority Gaps ({missingSkills.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No major skill gaps detected!</span>
                ) : (
                  missingSkills.map((gap) => (
                    <span
                      key={gap}
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-xs font-medium text-amber-300"
                    >
                      {gap}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skill Inventory Header & Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 backdrop-blur-xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategoryTab("all")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  categoryTab === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({skills.length})
              </button>
              <button
                onClick={() => setCategoryTab("technical")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  categoryTab === "technical"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Languages & Tech
              </button>
              <button
                onClick={() => setCategoryTab("tools")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  categoryTab === "tools"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tools & Frameworks
              </button>
              <button
                onClick={() => setCategoryTab("architecture")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  categoryTab === "architecture"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Architecture & DevOps
              </button>
              <button
                onClick={() => setCategoryTab("soft")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  categoryTab === "soft"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Soft Skills
              </button>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passport skills..."
                className="pl-9 h-9 rounded-xl bg-secondary/30 border-border/80 text-xs"
              />
            </div>
          </div>

          {/* Skill Grid */}
          {filteredSkills.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-dashed border-border/80">
              <Award className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-foreground">No skills match your filter</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add custom technical proficiencies or parse your resume to build your evidence-based passport.
                </p>
              </div>
              <Button
                onClick={() => setIsAddOpen(true)}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1 border-primary/30 text-primary"
              >
                <Plus className="h-3 w-3" />
                <span>Add First Skill</span>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="glass-card rounded-2xl p-4 border border-border/60 hover:border-primary/40 hover:bg-secondary/40 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          {skill.skill_name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          {skill.skill_category || "Technical"}
                        </span>
                      </div>

                      <button
                        onClick={() => setSkillToDelete(skill)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete skill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {getSourceBadge(skill.source)}
                    </div>
                  </div>

                  {/* Confidence / Mastery Indicator */}
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Assessed Confidence</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(skill.confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${Math.round(skill.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Skill Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                Add Skill to Passport
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Include a technical capability, framework, or soft skill with credible evidence.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSkill} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Skill Name</Label>
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. TypeScript, Docker, System Design..."
                  className="rounded-xl text-xs h-9 bg-secondary/30"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Category</Label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full rounded-xl text-xs h-9 bg-secondary/30 border border-border px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="technical">Technical & Programming</option>
                  <option value="tools">Frameworks & Tools</option>
                  <option value="architecture">Architecture & Cloud</option>
                  <option value="soft">Soft Skills & Communication</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Evidence Tier</Label>
                <select
                  value={newSkillSource}
                  onChange={(e) => setNewSkillSource(e.target.value)}
                  className="w-full rounded-xl text-xs h-9 bg-secondary/30 border border-border px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="manual">Self-Reported</option>
                  <option value="project">Supported by Code Project</option>
                  <option value="resume">Extracted from Resume</option>
                  <option value="interview">Assessed via Interview Studio</option>
                  <option value="verified">Verified Credential</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="font-semibold text-foreground">Proficiency / Confidence</Label>
                  <span className="text-muted-foreground">{Math.round(newSkillConfidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={newSkillConfidence}
                  onChange={(e) => setNewSkillConfidence(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-semibold text-white shadow-md"
                >
                  {isSubmitting ? "Saving..." : "Add to Passport"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={Boolean(skillToDelete)} onOpenChange={() => setSkillToDelete(null)}>
          <DialogContent className="max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-base font-bold text-foreground">
                Remove Skill?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to remove <span className="text-foreground font-semibold">"{skillToDelete?.skill_name}"</span> from your Skill Passport? This will not affect unrelated project or resume data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSkillToDelete(null)}
                className="rounded-xl text-xs"
              >
                Keep Skill
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSkill}
                className="rounded-xl text-xs font-semibold"
              >
                Delete Skill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Passport Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                <span>Shareable Skill Passport</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Generate a secure, unguessable public link to showcase your verified skills to employers or recruiters. Private email, notes, and password data are strictly omitted.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/60">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Public Sharing</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isPublic ? "Active and accessible via link" : "Private (Only accessible by you)"}
                  </p>
                </div>
                <Button
                  onClick={handleToggleShare}
                  disabled={isSharingLoading}
                  size="sm"
                  variant={isPublic ? "destructive" : "default"}
                  className="rounded-xl text-xs h-8"
                >
                  {isSharingLoading ? "Updating..." : isPublic ? "Revoke Link" : "Enable Public Link"}
                </Button>
              </div>

              {isPublic && shareUrl && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Your Public Passport URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      className="rounded-xl text-xs h-9 bg-secondary/30 font-mono text-[11px]"
                    />
                    <Button
                      onClick={handleCopyShareLink}
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 px-3 shrink-0 text-xs gap-1 border-primary/30 text-primary"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                  <div className="pt-1">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Preview Public Passport</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareOpen(false)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
