import React, { useState } from "react";
import { MessageSquare, Plus, Trash2, Bot, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatChartDate } from "@/lib/careerMetrics";
import type { CopilotConversation } from "@/types";

interface CopilotSidebarProps {
  conversations: CopilotConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => Promise<void>;
  isLoading?: boolean;
}

export function CopilotSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isLoading = false,
}: CopilotSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (conv: CopilotConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || "Career Discussion");
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditTitle("");
  };

  const handleSaveRename = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim() || !onRenameConversation) {
      cancelEditing();
      return;
    }
    await onRenameConversation(id, editTitle.trim());
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col h-full min-h-[480px] max-h-[600px] space-y-4 border border-border/60 shadow-lg">
      {/* Top Action */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Copilot Threads</h3>
            <p className="text-[11px] text-muted-foreground">{conversations.length} Active Sessions</p>
          </div>
        </div>

        <Button
          onClick={onNewConversation}
          variant="gradient"
          size="sm"
          className="h-8 gap-1.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all hover:scale-105"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New</span>
        </Button>
      </div>

      {/* Conversations Scroll List */}
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-1.5">
          {conversations.length === 0 && !isLoading && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations yet. Start a new session with your AI Career Copilot.
            </div>
          )}

          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            if (isEditing) {
              return (
                <div
                  key={conv.id}
                  className="rounded-xl p-2 bg-secondary/80 border border-primary/40 space-y-2 text-xs"
                >
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveRename(conv.id);
                      if (e.key === "Escape") cancelEditing();
                    }}
                    autoFocus
                    className="h-7 text-xs bg-background/80"
                  />
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => cancelEditing(e)}
                      title="Cancel"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="gradient"
                      onClick={(e) => void handleSaveRename(conv.id, e)}
                      title="Save"
                      className="h-6 w-6 text-white"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between rounded-xl p-2.5 text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/15 border border-primary/40 text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs">{conv.title || "Career Discussion"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">
                      {conv.updated_at ? formatChartDate(conv.updated_at) : "Active"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {onRenameConversation && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => startEditing(conv, e)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg"
                      title="Rename thread"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
