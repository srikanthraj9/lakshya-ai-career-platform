import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ArrowLeft,
  User,
  Briefcase,
  Award,
  FileText,
  Mic,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Eye,
  MessageSquare,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Layers,
  UserCheck,
  UserX,
  ShieldCheck,
  Mail,
  KeyRound,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const BOOTSTRAP_ADMIN_EMAILS = new Set(["srikanthuppalapati09@gmail.com", "admin@lakshya.ai"]);

export function AdminUserWorkspacePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "resumes" | "interviews" | "applications" | "copilot" | "activity" | "audit"
  >("overview");

  // Simulation modal state
  const [showSimModal, setShowSimModal] = useState(false);
  const [simReason, setSimReason] = useState("Diagnostic inspection of candidate experience");
  const [simDuration, setSimDuration] = useState(30);

  // Administrative lifecycle action modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // 1. Overview 360
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useQuery({
    queryKey: ["admin", "user-360", userId],
    queryFn: () => (userId ? adminService.getUserDetail(userId) : null),
    enabled: !!userId,
  });

  // 2. Modular Sub-queries
  const { data: resumes = [], isLoading: resumesLoading } = useQuery({
    queryKey: ["admin", "user-resumes", userId],
    queryFn: () => (userId ? adminService.getUserResumes(userId) : []),
    enabled: !!userId && activeTab === "resumes",
  });

  const { data: interviews = [], isLoading: interviewsLoading } = useQuery({
    queryKey: ["admin", "user-interviews", userId],
    queryFn: () => (userId ? adminService.getUserInterviews(userId) : []),
    enabled: !!userId && activeTab === "interviews",
  });

  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["admin", "user-applications", userId],
    queryFn: () => (userId ? adminService.getUserApplications(userId) : []),
    enabled: !!userId && activeTab === "applications",
  });

  const { data: copilotSessions = [], isLoading: copilotLoading } = useQuery({
    queryKey: ["admin", "user-copilot", userId],
    queryFn: () => (userId ? adminService.getUserCopilot(userId) : []),
    enabled: !!userId && activeTab === "copilot",
  });

  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "user-activity", userId],
    queryFn: () => (userId ? adminService.getUserActivity(userId) : []),
    enabled: !!userId && activeTab === "activity",
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "user-audit", userId],
    queryFn: () => (userId ? adminService.getUserAudit(userId) : []),
    enabled: !!userId && activeTab === "audit",
  });

  // 3. Start Simulation Mutation (Super Admin Only)
  const startSimulationMutation = useMutation({
    mutationFn: () =>
      adminService.startSimulation(userId!, simReason, simDuration),
    onSuccess: (res) => {
      if (res.token) {
        sessionStorage.setItem("simulation_token", res.token);
        sessionStorage.setItem(
          "simulation_session",
          JSON.stringify({
            target_user_id: res.target_user_id,
            target_user_name: res.target_user_name || user?.full_name,
            target_user_email: res.target_user_email || user?.email,
            expires_at: res.expires_at,
          })
        );
        window.dispatchEvent(new Event("simulation_changed"));
        toast.success("Simulation Started", {
          description: `Viewing workspace as candidate ${user?.full_name || user?.email} in Read-Only mode.`,
        });
        setShowSimModal(false);
        navigate("/dashboard");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to start View-As simulation", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  // 4. Administrative Lifecycle Mutations
  const suspendMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => adminService.suspendUser(userId!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-360", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-audit", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("Candidate Suspended", {
        description: `Account for ${user?.full_name || user?.email} is now restricted.`,
      });
      setShowSuspendModal(false);
      setSuspendReason("");
    },
    onError: (err: any) => {
      toast.error("Suspension Failed", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => adminService.activateUser(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-360", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-audit", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("Candidate Activated", {
        description: `Account for ${user?.full_name || user?.email} has been reactivated.`,
      });
      setShowActivateModal(false);
    },
    onError: (err: any) => {
      toast.error("Activation Failed", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (newRole: string) => adminService.updateUserRole(userId!, { role: newRole }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-360", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-audit", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("Role Updated", {
        description: `User role successfully changed to ${res.role}.`,
      });
      setShowRoleModal(false);
      setPendingRole(null);
    },
    onError: (err: any) => {
      toast.error("Role Update Failed", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: (verified: boolean) =>
      adminService.updateUserRole(userId!, { is_email_verified: verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-360", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-audit", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("Email Verification Updated", {
        description: `Email verification status updated for ${user?.full_name || user?.email}.`,
      });
      setShowVerifyModal(false);
    },
    onError: (err: any) => {
      toast.error("Verification Update Failed", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  if (userLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
          <span className="text-xs text-muted-foreground font-semibold">
            Aggregating real-time candidate 360° intelligence...
          </span>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-3" />
        <h2 className="text-xl font-bold text-foreground">Candidate Workspace Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          The requested candidate could not be found or you do not have administrative permission to view this account.
        </p>
        <Link to="/admin/users" className="mt-4">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users Directory
          </Button>
        </Link>
      </div>
    );
  }

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isSelf = Boolean(currentUser?.id && user?.id && currentUser.id === user.id);
  const isTargetBootstrap = Boolean(user?.email && BOOTSTRAP_ADMIN_EMAILS.has(user.email.toLowerCase()));
  const isTargetSuperAdmin = user?.role === "super_admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Prominent Admin Inspection Mode Warning Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card/80 to-card/60 p-5 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold shrink-0 shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-primary">
                CANDIDATE 360° INSPECTION WORKSPACE
              </span>
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                Safe Audit Scope
              </Badge>
            </div>
            <span className="text-xs text-foreground mt-0.5">
              Live operational diagnosis for <strong>{user.full_name || "Unnamed"}</strong> ({user.email})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button
              size="sm"
              onClick={() => setShowSimModal(true)}
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs h-9 gap-2 shadow-md"
            >
              <Eye className="h-4 w-4" />
              <span>View-As Candidate</span>
            </Button>
          )}

          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary font-black text-2xl border border-primary/20 shadow-inner">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-foreground">{user.full_name || "Unnamed Candidate"}</h1>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wide">
                  {user.role}
                </Badge>
                {user.is_suspended ? (
                  <Badge variant="destructive" className="text-[10px] font-bold">
                    SUSPENDED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    ACTIVE
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">{user.email}</span>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground/80">
                <span className="font-semibold text-primary">
                  Target Role: {user.target_role || "Exploring Opportunities"}
                </span>
                <span className="text-muted-foreground">&bull;</span>
                <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
            <div className="flex flex-col text-left md:text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Career Readiness
              </span>
              <span className="text-3xl font-black text-primary">
                {user.readiness_score != null ? `${Math.round(user.readiness_score)}%` : "--"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {user.readiness_score != null
                  ? user.onboarding_completed
                    ? "Onboarded"
                    : "Onboarding Pending"
                  : "Awaiting Assessment"}
              </span>
            </div>
          </div>
        </div>

        {/* Administrative Action Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lifecycle Actions:
            </span>

            {/* Suspend / Activate Button */}
            {user.is_suspended ? (
              <Button
                size="sm"
                variant="outline"
                data-testid="action-activate-user"
                onClick={() => setShowActivateModal(true)}
                disabled={activateMutation.isPending || isTargetBootstrap}
                className="h-8 text-xs gap-1.5 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Reactivate Account</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                data-testid="action-suspend-user"
                onClick={() => setShowSuspendModal(true)}
                disabled={suspendMutation.isPending || isTargetBootstrap || isSelf}
                className="h-8 text-xs gap-1.5 rounded-xl font-medium"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>Suspend Candidate</span>
              </Button>
            )}

            {/* Role Change Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="user-role-select" className="text-xs text-muted-foreground font-medium">Role:</label>
              <select
                id="user-role-select"
                data-testid="action-change-role"
                value={user.role}
                onChange={(e) => {
                  setPendingRole(e.target.value);
                  setShowRoleModal(true);
                }}
                disabled={updateRoleMutation.isPending || isTargetBootstrap || isSelf || (!isSuperAdmin && isTargetSuperAdmin)}
                className="h-8 rounded-xl border border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="user">Candidate (user)</option>
                <option value="admin">Admin</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>

            {/* Email Verification Action */}
            <Button
              size="sm"
              variant="outline"
              data-testid="action-toggle-verification"
              onClick={() => setShowVerifyModal(true)}
              disabled={toggleVerificationMutation.isPending || isTargetBootstrap}
              className={`h-8 text-xs gap-1.5 rounded-xl font-medium ${
                user.is_email_verified
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{user.is_email_verified ? "Email Verified" : "Verify Email"}</span>
            </Button>
          </div>

          {/* Protection Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {isTargetBootstrap && (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                Protected Bootstrap Account
              </Badge>
            )}
            {isSelf && (
              <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                Current Admin (Self-Action Protected)
              </Badge>
            )}
            {!isSuperAdmin && isTargetSuperAdmin && (
              <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                Super Admin Privilege Required
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Modular Domain Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/40">
        {[
          { id: "overview", label: "Overview 360°", icon: Sparkles, count: undefined },
          { id: "resumes", label: "Resumes & ATS", icon: FileText, count: user.resumes_count },
          { id: "interviews", label: "Mock Interviews", icon: Mic, count: user.interviews_count },
          { id: "applications", label: "Applications", icon: Briefcase, count: user.applications_count },
          { id: "copilot", label: "Copilot Mentorship", icon: MessageSquare, count: undefined },
          { id: "activity", label: "Activity Stream", icon: Activity, count: undefined },
          { id: "audit", label: "Governance Audit", icon: History, count: undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview 360 */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">ATS Score</span>
                <FileText className="h-4 w-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-black text-foreground mt-2 block">
                {user.latest_ats_score ? `${Math.round(user.latest_ats_score)}%` : "N/A"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {user.resumes_count} resumes evaluated
              </span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Mock Interview Score</span>
                <Mic className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-2xl font-black text-foreground mt-2 block">
                {user.latest_interview_score ? `${Math.round(user.latest_interview_score)}%` : "N/A"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {user.interviews_count} voice sessions
              </span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Applications</span>
                <Briefcase className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-2xl font-black text-foreground mt-2 block">
                {user.applications_count}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Pipeline opportunities
              </span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Active Goals</span>
                <Award className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-black text-foreground mt-2 block">
                {user.active_goals_count}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {user.recommendations_count} recommendations
              </span>
            </div>
          </div>

          {/* Profile & Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-6">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Verified Candidate Skills ({user.skills?.length || 0})
              </h3>
              {user.skills && user.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No skills extracted yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-6">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Career Profile Blueprint
              </h3>
              <div className="flex flex-col gap-2 text-xs divide-y divide-border/40">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Career Stage</span>
                  <span className="font-medium text-foreground capitalize">
                    {user.career_profile?.career_stage || "Early Career"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Education</span>
                  <span className="font-medium text-foreground">
                    {user.career_profile?.education_level || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Specialization</span>
                  <span className="font-medium text-foreground">
                    {user.career_profile?.specialization || "Computer Science / Engineering"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Health & Integrity Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-6">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Candidate Integrity & Readiness Checklist
              </h3>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-muted-foreground font-medium">Email Verification</span>
                  <Badge variant={user.is_email_verified ? "outline" : "destructive"} className="text-[10px]">
                    {user.is_email_verified ? "Verified" : "Pending Verification"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-muted-foreground font-medium">Onboarding Journey</span>
                  <Badge variant={user.onboarding_completed ? "outline" : "secondary"} className="text-[10px]">
                    {user.onboarding_completed ? "Completed" : "In Progress"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-muted-foreground font-medium">Resume Artifact</span>
                  <Badge variant={user.resumes_count > 0 ? "outline" : "secondary"} className="text-[10px]">
                    {user.resumes_count > 0 ? `${user.resumes_count} Uploaded` : "Missing Resume"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-muted-foreground font-medium">Target Role Defined</span>
                  <Badge variant={user.target_role ? "outline" : "secondary"} className="text-[10px]">
                    {user.target_role ? "Configured" : "Unspecified"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Unified Candidate Activity Stream
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("activity")}
                  className="h-7 text-xs text-primary p-0"
                >
                  View Full Stream &rarr;
                </Button>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-background/40">
                  <FileText className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {user.resumes_count > 0 ? `${user.resumes_count} Resume(s) Evaluated` : "No resumes evaluated yet"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Latest ATS Score: {user.latest_ats_score ? `${Math.round(user.latest_ats_score)}%` : "Not evaluated"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-background/40">
                  <Mic className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {user.interviews_count > 0 ? `${user.interviews_count} Mock Interview Session(s)` : "No mock interviews completed"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Latest Performance: {user.latest_interview_score ? `${Math.round(user.latest_interview_score)}%` : "Not completed"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-background/40">
                  <Briefcase className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {user.applications_count > 0 ? `${user.applications_count} Opportunity Pipeline Applications` : "No active pipeline applications"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Status: Active Candidate Tracking
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Resumes */}
      {activeTab === "resumes" && (
        <div className="flex flex-col gap-4">
          {resumesLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading resumes...</div>
          ) : resumes.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No resumes uploaded by this candidate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{r.original_filename}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : "Recently"}
                        </span>
                      </div>
                    </div>
                    {r.ats_score !== null && r.ats_score !== undefined && (
                      <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/30 text-xs font-bold">
                        ATS: {Math.round(r.ats_score)}%
                      </Badge>
                    )}
                  </div>

                  {r.overall_feedback && (
                    <p className="text-xs text-foreground/80 bg-background/60 p-3 rounded-xl border border-border/40">
                      {r.overall_feedback}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                    <span>{r.skills_count} skills extracted</span>
                    <span className="text-amber-500">{r.missing_skills_count} skill gaps identified</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Interviews */}
      {activeTab === "interviews" && (
        <div className="flex flex-col gap-4">
          {interviewsLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading interview sessions...</div>
          ) : interviews.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No interview sessions recorded for this candidate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map((iv) => (
                <div key={iv.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 font-bold">
                        <Mic className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{iv.role}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {iv.difficulty}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{iv.mode}</span>
                        </div>
                      </div>
                    </div>

                    {iv.overall_score !== null && iv.overall_score !== undefined && (
                      <span className="text-xl font-black text-purple-500">
                        {Math.round(iv.overall_score)}%
                      </span>
                    )}
                  </div>

                  {iv.feedback_summary && (
                    <p className="text-xs text-foreground/80 bg-background/60 p-3 rounded-xl border border-border/40">
                      {iv.feedback_summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                    <span>{iv.messages_count} dialogue turns</span>
                    <span>Status: <strong className="capitalize">{iv.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Applications */}
      {activeTab === "applications" && (
        <div className="flex flex-col gap-4">
          {applicationsLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No job applications tracked by this candidate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col gap-2.5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 font-bold">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-foreground">{app.job_title}</span>
                        <span className="text-[11px] text-muted-foreground">{app.company_name}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {app.stage}
                    </Badge>
                  </div>

                  {app.location && (
                    <span className="text-[11px] text-muted-foreground">{app.location}</span>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30 font-mono">
                    <span>{app.debriefs_count} debriefs</span>
                    <span>Applied: {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "Saved"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Copilot */}
      {activeTab === "copilot" && (
        <div className="flex flex-col gap-4">
          {copilotLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading Copilot chat sessions...</div>
          ) : copilotSessions.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No Copilot conversation history found.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {copilotSessions.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{c.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {c.messages_count} messages
                    </Badge>
                  </div>
                  {c.last_message_preview && (
                    <p className="text-xs text-muted-foreground bg-background/60 p-2.5 rounded-xl border border-border/30">
                      "{c.last_message_preview}"
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    Last active: {new Date(c.updated_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Activity Stream */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          {activityLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading activity stream...</div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No recent activity recorded for this candidate.
            </div>
          ) : (
            <div className="flex flex-col gap-2 divide-y divide-border/30 rounded-2xl border border-border/60 bg-card/60 p-4">
              {activities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-foreground">{act.title}</span>
                      <span className="text-[11px] text-muted-foreground">{act.description}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Audit History */}
      {activeTab === "audit" && (
        <div className="flex flex-col gap-4">
          {auditLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground rounded-2xl border border-border/50 bg-card/40">
              No administrative audit actions targeting this candidate.
            </div>
          ) : (
            <div className="flex flex-col gap-2 divide-y divide-border/30 rounded-2xl border border-border/60 bg-card/60 p-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] font-mono">{log.action_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        by Admin: <code className="text-primary font-mono">{String(log.admin_user_id).slice(0, 8)}...</code>
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.action_metadata && Object.keys(log.action_metadata).length > 0 && (
                    <pre className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/30 overflow-x-auto">
                      {JSON.stringify(log.action_metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View-As Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-500 border-b border-border/40 pb-3">
              <Eye className="h-6 w-6" />
              <h3 className="font-bold text-base text-foreground">
                Start View-As Simulation
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              You will view the Lakshya AI candidate workspace exactly as{" "}
              <strong className="text-foreground">{user.full_name || user.email}</strong> sees it.
              All administrative operations remain strictly <strong>Read-Only</strong> and actor identity is preserved in audit logs.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground">
                  Diagnostic Reason (Audit Requirement)
                </label>
                <Input
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="text-xs h-8 bg-background/80"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground">
                  Session Duration (Minutes)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={simDuration}
                  onChange={(e) => setSimDuration(Number(e.target.value))}
                  className="text-xs h-8 bg-background/80"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSimModal(false)}
                disabled={startSimulationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => startSimulationMutation.mutate()}
                disabled={startSimulationMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold"
              >
                {startSimulationMutation.isPending ? "Starting Simulation..." : "Launch View-As Mode"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Candidate Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive font-bold shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Suspend Candidate Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restricts access for {user.full_name || user.email} immediately.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="suspend-reason-input" className="text-xs font-bold text-foreground">
                Suspension Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                id="suspend-reason-input"
                rows={3}
                placeholder="Specify the operational, policy, or security reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-destructive"
                required
              />
              <span className="text-[11px] text-muted-foreground">
                This reason is permanently logged in the immutable audit trail.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason("");
                }}
                disabled={suspendMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                data-testid="confirm-suspend-submit"
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                onClick={() => suspendMutation.mutate({ reason: suspendReason.trim() })}
                className="font-bold gap-1.5"
              >
                {suspendMutation.isPending ? "Suspending..." : "Confirm Suspension"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Candidate Modal */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/40 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 font-bold shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Reactivate Candidate Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restore platform access for {user.full_name || user.email}.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will clear the account suspension and re-enable active candidate workflows (resumes, interviews, applications). The activation event will be recorded in the audit trail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivateModal(false)}
                disabled={activateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="confirm-activate-submit"
                disabled={activateMutation.isPending}
                onClick={() => activateMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {activateMutation.isPending ? "Reactivating..." : "Confirm Reactivation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Change Administrative Role</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {user.full_name || user.email}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Role:</span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">{user.role}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New Role:</span>
                <Badge variant="default" className="font-mono text-[10px] uppercase">{pendingRole}</Badge>
              </div>
            </div>

            {pendingRole === "super_admin" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Super Administrators have full, unrestricted governance permissions including database exploration and record mutation.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRoleModal(false);
                  setPendingRole(null);
                }}
                disabled={updateRoleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="confirm-role-submit"
                disabled={updateRoleMutation.isPending}
                onClick={() => updateRoleMutation.mutate(pendingRole)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {updateRoleMutation.isPending ? "Updating Role..." : "Confirm Role Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {user.is_email_verified ? "Revoke Email Verification" : "Manually Verify Email"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {user.full_name || user.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {user.is_email_verified
                ? "Revoking email verification will require the user to re-authenticate or verify their email address before accessing restricted candidate features."
                : "Manually marking this email as verified bypasses the email delivery token flow. Use only when candidate identity has been verified through trusted channels."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVerifyModal(false)}
                disabled={toggleVerificationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="confirm-verification-submit"
                disabled={toggleVerificationMutation.isPending}
                onClick={() => toggleVerificationMutation.mutate(!user.is_email_verified)}
                className={user.is_email_verified ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-emerald-600 text-white hover:bg-emerald-700"}
              >
                {toggleVerificationMutation.isPending
                  ? "Updating..."
                  : user.is_email_verified
                  ? "Revoke Verification"
                  : "Confirm Verification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
