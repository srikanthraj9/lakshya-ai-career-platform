import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function AdminRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role || "user";
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6 shadow-lg shadow-destructive/5">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Access Restricted
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            You do not have administrator permissions to access the Lakshya AI Admin Control Center. This area is reserved for authorized platform administrators.
          </p>
          <div className="mt-8 flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Link to="/dashboard">
              <Button variant="default" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Candidate Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
