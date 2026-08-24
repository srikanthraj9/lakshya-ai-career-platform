import React, { useState } from "react";
import { Megaphone, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformAnnouncement } from "@/types";

interface AnnouncementManagerProps {
  announcements: PlatformAnnouncement[];
  isLoading: boolean;
  onCreateAnnouncement: (payload: {
    title: string;
    message: string;
    type: string;
    target_audience: string;
  }) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
}

export function AnnouncementManager({
  announcements,
  isLoading,
  onCreateAnnouncement,
  onDeleteAnnouncement,
}: AnnouncementManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [targetAudience, setTargetAudience] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
        target_audience: targetAudience,
      });
      setIsCreateOpen(false);
      setTitle("");
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Platform Announcements</h2>
          <p className="text-xs text-muted-foreground">
            Broadcast platform updates, scheduled maintenance notices, or new feature releases to candidates.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 rounded-xl text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>Broadcast Notice</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No active announcements</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an announcement to broadcast alerts or notifications across candidate dashboards.
            </p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    ann.type === "maintenance"
                      ? "bg-amber-500/10 text-amber-500"
                      : ann.type === "warning"
                      ? "bg-destructive/10 text-destructive"
                      : ann.type === "success"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{ann.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase ${
                        ann.type === "maintenance"
                          ? "border-amber-500/30 text-amber-500"
                          : ann.type === "warning"
                          ? "border-destructive/30 text-destructive"
                          : "border-primary/30 text-primary"
                      }`}
                    >
                      {ann.type}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      Audience: {ann.target_audience}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                    {ann.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 mt-2">
                    Published: {new Date(ann.starts_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-center"
                onClick={() => onDeleteAnnouncement(ann.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Broadcast Announcement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish a banner notification to candidate workspaces.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Title</label>
              <Input
                placeholder="e.g., Scheduled Platform Maintenance Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">Notice Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-9 rounded-xl border border-border/60 bg-background px-3 text-xs"
                >
                  <option value="info">Info</option>
                  <option value="success">Success / Release</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="h-9 rounded-xl border border-border/60 bg-background px-3 text-xs"
                >
                  <option value="all">All Users & Admins</option>
                  <option value="users">Candidates Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Announcement Message</label>
              <Textarea
                placeholder="Detailed announcement message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !message.trim() || isSubmitting}>
              {isSubmitting ? "Publishing..." : "Broadcast Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
