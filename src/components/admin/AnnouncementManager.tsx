import React, { useState } from "react";
import { Megaphone, Plus, Trash2, Calendar, AlertCircle, Edit, Power, Clock } from "lucide-react";
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
    is_active?: boolean;
    expires_at?: string | null;
  }) => Promise<void>;
  onUpdateAnnouncement?: (
    id: string,
    payload: {
      title?: string;
      message?: string;
      type?: string;
      target_audience?: string;
      is_active?: boolean;
      expires_at?: string | null;
    }
  ) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
}

export function AnnouncementManager({
  announcements,
  isLoading,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}: AnnouncementManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<PlatformAnnouncement | null>(null);
  const [announcementToEdit, setAnnouncementToEdit] = useState<PlatformAnnouncement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [targetAudience, setTargetAudience] = useState("all");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editType, setEditType] = useState("info");
  const [editTargetAudience, setEditTargetAudience] = useState("all");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
        target_audience: targetAudience,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setIsCreateOpen(false);
      setTitle("");
      setMessage("");
      setExpiresAt("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (ann: PlatformAnnouncement) => {
    setAnnouncementToEdit(ann);
    setEditTitle(ann.title);
    setEditMessage(ann.message);
    setEditType(ann.type || "info");
    setEditTargetAudience(ann.target_audience || "all");
    setEditIsActive(ann.is_active ?? true);
    setEditExpiresAt(ann.expires_at ? new Date(ann.expires_at).toISOString().slice(0, 16) : "");
  };

  const handleUpdate = async () => {
    if (!announcementToEdit || !editTitle.trim() || !editMessage.trim()) return;
    setIsUpdating(true);
    try {
      if (onUpdateAnnouncement) {
        await onUpdateAnnouncement(announcementToEdit.id, {
          title: editTitle.trim(),
          message: editMessage.trim(),
          type: editType,
          target_audience: editTargetAudience,
          is_active: editIsActive,
          expires_at: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        });
      }
      setAnnouncementToEdit(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (ann: PlatformAnnouncement) => {
    if (!onUpdateAnnouncement) return;
    await onUpdateAnnouncement(ann.id, {
      is_active: !ann.is_active,
    });
  };

  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
    } finally {
      setIsDeleting(false);
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
          announcements.map((ann) => {
            const isExpired = ann.expires_at ? new Date(ann.expires_at) <= new Date() : false;
            const isActive = (ann.is_active ?? true) && !isExpired;

            return (
              <div
                key={ann.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border p-5 backdrop-blur-xl shadow-sm transition-all ${
                  !isActive ? "border-border/30 bg-card/30 opacity-75" : "border-border/60 bg-card/60"
                }`}
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

                      {/* Status Badges */}
                      {isExpired ? (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[9px] gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Expired</span>
                        </Badge>
                      ) : isActive ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[9px] gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted bg-muted/20 text-muted-foreground text-[9px]">
                          Draft / Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                      {ann.message}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 mt-2">
                      <span>Published: {new Date(ann.starts_at || (ann as any).created_at).toLocaleString()}</span>
                      {ann.expires_at && (
                        <span>Expires: {new Date(ann.expires_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Toggle Active, Edit, Delete */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {onUpdateAnnouncement && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 text-xs gap-1 rounded-xl ${
                          isActive ? "text-emerald-500 hover:text-amber-500" : "text-muted-foreground hover:text-emerald-500"
                        }`}
                        title={isActive ? "Deactivate announcement" : "Activate announcement"}
                        onClick={() => handleToggleActive(ann)}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{isActive ? "Deactivate" : "Activate"}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
                        title="Edit announcement"
                        aria-label={`Edit announcement: ${ann.title}`}
                        onClick={() => openEditDialog(ann)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 rounded-xl"
                    title={`Delete announcement: ${ann.title}`}
                    aria-label={`Delete announcement: ${ann.title}`}
                    onClick={() => setAnnouncementToDelete(ann)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
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
              Configure and preview an administrative notification before broadcasting to candidates.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Title <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g., Scheduled Platform Maintenance Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 rounded-xl text-xs"
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
              <label className="font-semibold text-foreground">Announcement Message <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Detailed announcement message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[75px] rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Expiration Date & Time (Optional)</label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Live Candidate Preview Card */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Live Candidate Preview
              </span>
              <div
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                  type === "maintenance"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : type === "warning"
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-primary/10 border-primary/30 text-primary"
                }`}
              >
                <Megaphone className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {title.trim() || "Announcement Title Preview"}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 border-current">
                      {type}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {message.trim() || "This is how your broadcast message will appear on candidate dashboards."}
                  </p>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Audience: {targetAudience === "all" ? "All Platform Users" : targetAudience === "users" ? "Candidates Only" : "Admins Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !message.trim() || isSubmitting}>
              {isSubmitting ? "Publishing..." : "Confirm & Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Modal */}
      <Dialog open={!!announcementToEdit} onOpenChange={(open) => !open && setAnnouncementToEdit(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              <span>Edit Announcement</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify the announcement message, target audience, active status, or expiration schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Title <span className="text-destructive">*</span></label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">Notice Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
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
                  value={editTargetAudience}
                  onChange={(e) => setEditTargetAudience(e.target.value)}
                  className="h-9 rounded-xl border border-border/60 bg-background px-3 text-xs"
                >
                  <option value="all">All Users & Admins</option>
                  <option value="users">Candidates Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Announcement Message <span className="text-destructive">*</span></label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="min-h-[75px] rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">Expiration Date & Time</label>
                <Input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="editIsActive" className="font-medium text-xs text-foreground cursor-pointer">
                  Broadcast as Active
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAnnouncementToEdit(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!editTitle.trim() || !editMessage.trim() || isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Confirmation Dialog */}
      <Dialog
        open={!!announcementToDelete}
        onOpenChange={(open) => !open && setAnnouncementToDelete(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Delete Announcement</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this broadcast announcement? This action cannot be undone and will immediately remove the notice from all candidate dashboards.
            </DialogDescription>
          </DialogHeader>

          {announcementToDelete && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
              <span className="font-bold text-foreground block">
                {announcementToDelete.title}
              </span>
              <p className="text-muted-foreground text-[11px] mt-1 line-clamp-2">
                {announcementToDelete.message}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnnouncementToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : "Confirm Deletion"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
