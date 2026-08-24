import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified, isOnboardingCompleted, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (!isEmailVerified && !isAdmin) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!isOnboardingCompleted && !isAdmin) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
