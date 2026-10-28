import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  User,
  Mail,
  Shield,
  Briefcase,
  Award,
  FileText,
  Mic,
  TrendingUp,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import type { AdminUserDetailResponse } from "@/types";

interface UserDetailDrawerProps {
  user: AdminUserDetailResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole?: (role: string) => Promise<void>;
  onSuspend?: () => void;
  onActivate?: () => void;
}

export function UserDetailDrawer({
  user,
  isOpen,
  onClose,
  onUpdateRole,
  onSuspend,
  onActivate,
}: UserDetailDrawerProps) {
  const { user: currentAdmin } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "user");
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Sync selectedRole if user changes
  React.useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user?.role]);

  if (!user) return null;

  const isSelf = user.id === currentAdmin?.id;

  const handleSaveRole = async (newRole: string) => {
    if (!onUpdateRole || newRole === user.role) return;
    setIsSavingRole(true);
    try {
      await onUpdateRole(newRole);
      setSelectedRole(newRole);
      setIsChangingRole(false);
    } finally {
      setIsSavingRole(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 flex flex-col gap-6">
        <SheetHeader className="text-left pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg">
              {user.full_name?.charAt(0) || user.email.charAt(0)}
            </div>
            <div className="flex flex-col">
              <SheetTitle className="text-lg font-bold text-foreground">
                {user.full_name || "Unnamed Candidate"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {user.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Summary Pill Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Readiness</span>
            <p className="text-base font-bold text-primary">
              {user.readiness_score != null ? `${Math.round(user.readiness_score)}%` : "--"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Resumes</span>
            <p className="text-base font-bold text-foreground">{user.resumes_count}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Interviews</span>
            <p className="text-base font-bold text-foreground">{user.interviews_count}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Apps</span>
            <p className="text-base font-bold text-foreground">{user.applications_count}</p>
          </div>
        </div>

        {/* Open Workspace CTA */}
        <Link to={`/admin/users/${user.id}/workspace`} onClick={onClose}>
          <Button className="w-full gap-2 rounded-xl shadow-md shadow-primary/20">
            <ExternalLink className="h-4 w-4" />
            <span>Open Candidate Workspace (Inspection Mode)</span>
          </Button>
        </Link>

        {/* Account Details Section */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
            Account Details
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">System Role</span>
              {isSelf ? (
                <Badge variant="outline" className="font-bold uppercase text-[10px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                  {user.role} (Current User)
                </Badge>
              ) : onUpdateRole ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedRole}
                    onChange={(e) => handleSaveRole(e.target.value)}
                    disabled={isSavingRole}
                    className="h-7 text-[11px] font-semibold bg-muted/60 rounded-lg px-2 border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="user">User / Candidate</option>
                    <option value="admin">Support Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {isSavingRole && <span className="text-[10px] text-muted-foreground animate-pulse">Saving...</span>}
                </div>
              ) : (
                <Badge variant="outline" className="font-bold uppercase text-[10px]">
                  {user.role}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Status</span>
              {user.is_suspended ? (
                <Badge variant="destructive" className="text-[10px]">
                  Suspended
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px]">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Email Verified</span>
              <span className="font-medium text-foreground">
                {user.is_email_verified ? "Verified" : "Pending Verification"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Registered On</span>
              <span className="font-medium text-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Career Profile Details */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
            Career Profile
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Target Role</span>
              <span className="font-semibold text-foreground">
                {user.target_role || "Not Selected"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Career Stage</span>
              <span className="font-medium text-foreground capitalize">
                {user.career_profile?.career_stage || "Early Career"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Active Goals</span>
              <span className="font-medium text-foreground">{user.active_goals_count}</span>
            </div>
          </div>

          {/* Skills Badges */}
          {user.skills && user.skills.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-border/30">
              <span className="text-[11px] text-muted-foreground font-semibold">Extracted Skills:</span>
              <div className="flex flex-wrap gap-1.5">
                {user.skills.map((sk) => (
                  <Badge key={sk} variant="secondary" className="text-[10px] px-2 py-0.5">
                    {sk}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {user.is_suspended ? (
            <Button
              variant="outline"
              className="w-full gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              onClick={onActivate}
            >
              <CheckCircle2 className="h-4 w-4" />
              Reactivate Account
            </Button>
          ) : isSelf ? (
            <Button
              variant="outline"
              disabled
              className="w-full gap-2 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <XCircle className="h-4 w-4" />
              Self-Suspension Prohibited
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onSuspend}
            >
              <XCircle className="h-4 w-4" />
              Suspend Account
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
