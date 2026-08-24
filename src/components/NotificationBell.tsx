import React, { useState } from "react";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { useNotifications } from "@/context/NotificationContext";

export function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:bg-secondary/60 hover:text-foreground"
        aria-label="Open notifications drawer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md shadow-primary/30"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
