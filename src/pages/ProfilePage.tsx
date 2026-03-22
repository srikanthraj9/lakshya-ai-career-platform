import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Shield } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return <EmptyState icon={User} title="Not logged in" description="Please log in to view your profile." actionLabel="Login" actionHref="/login" />;

  return (
    <PageTransition>
      <div className="mx-auto max-w-lg space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account details.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card glass-card-hover rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">{user.full_name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined:</span>
              <span className="text-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Account:</span>
              <span className="text-foreground">Active</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
