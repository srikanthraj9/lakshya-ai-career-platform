import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Target,
  Brain,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Map,
  Lock,
  Bell,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfileTabs, type ProfileTab } from "@/components/profile/ProfileTabs";
import { ProfileGoalEditor } from "@/components/profile/ProfileGoalEditor";
import { CareerActivityTimeline } from "@/components/activity/CareerActivityTimeline";
import { useCareerContext } from "@/hooks/useCareerContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const { user } = useAuth();
  const { targetRole, readiness, activeResume, detectedSkills, missingSkills } = useCareerContext();

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Master Identity Card */}
        <ProfileIdentityCard />

        {/* Tab Navigation */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 md:grid-cols-2 items-start"
            >
              {/* Left: Career Health Breakdown */}
              <div className="glass-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-bold text-foreground">Career Readiness Breakdown</h3>
                  </div>
                  <span className="text-xs font-bold text-primary">{readiness.overallScore}% Overall</span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Resume ATS Compatibility</span>
                      <span className="font-semibold text-foreground">{readiness.resumeHealth ?? 0}%</span>
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
                      <span>Target Role Skill Match</span>
                      <span className="font-semibold text-foreground">{readiness.roleMatch ?? 0}%</span>
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
                      <span>Interview Readiness</span>
                      <span className="font-semibold text-foreground">{readiness.interviewReadiness ?? 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${readiness.interviewReadiness ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Learning Roadmap Progress</span>
                      <span className="font-semibold text-foreground">{readiness.roadmapProgress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${readiness.roadmapProgress ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quick Links & Connected Workspaces */}
              <div className="glass-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="font-display text-sm font-bold text-foreground">Active Workspaces</h3>
                  <StatusBadge variant="ai" dot>
                    Connected
                  </StatusBadge>
                </div>

                <div className="space-y-2.5">
                  <Link
                    to="/resume"
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-secondary/20 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Resume Intelligence Studio</p>
                        <p className="text-[10px] text-muted-foreground">
                          {activeResume?.file_name || "No resume loaded"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>

                  <Link
                    to="/roadmap"
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-secondary/20 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Map className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Career Roadmap</p>
                        <p className="text-[10px] text-muted-foreground">Active milestone tracking</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </Link>
                </div>
              </div>

              {/* Verified Career Timeline */}
              <div className="md:col-span-2">
                <CareerActivityTimeline maxItems={6} />
              </div>
            </motion.div>
          )}

          {activeTab === "goals" && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProfileGoalEditor />
            </motion.div>
          )}

          {activeTab === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-bold text-foreground">
                      Verified Technical Inventory ({detectedSkills.length})
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {missingSkills.length > 0 && (
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Identified Learning Priorities ({missingSkills.length})
                      </h3>
                    </div>
                    <Link to="/roadmap">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-500/30 text-amber-300">
                        <Map className="h-3 w-3" />
                        <span>Manage in Roadmap</span>
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {missingSkills.map((gap) => (
                      <span
                        key={gap}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-card rounded-3xl p-6 space-y-6"
            >
              <div className="space-y-1 pb-3 border-b border-border/50">
                <h3 className="font-display text-sm font-bold text-foreground">Account & Security Preferences</h3>
                <p className="text-xs text-muted-foreground">Manage your credentials and notifications</p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                  <Input
                    defaultValue={user?.full_name || ""}
                    className="h-10 rounded-xl bg-secondary/30 border-border/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                  <Input
                    defaultValue={user?.email || ""}
                    disabled
                    className="h-10 rounded-xl bg-secondary/20 border-border/60 text-xs text-muted-foreground"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between p-3 rounded-2xl bg-secondary/20 border border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Email Notifications</p>
                    <p className="text-[10px] text-muted-foreground">Weekly career readiness report and job match alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => toast.success("Preferences updated")}
                  variant="gradient"
                  size="sm"
                  className="rounded-xl text-xs font-semibold text-white shadow-md"
                >
                  Save Preferences
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
