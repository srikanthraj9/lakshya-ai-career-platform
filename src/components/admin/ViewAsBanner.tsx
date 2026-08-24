import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ShieldAlert, XCircle, Clock, AlertTriangle } from "lucide-react";
import { adminService } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ViewAsBanner() {
  const navigate = useNavigate();
  const [session, setSession] = useState<{
    target_user_id: string;
    target_user_name?: string;
    target_user_email?: string;
    expires_at: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isEnding, setIsEnding] = useState(false);

  const checkSimulation = () => {
    const raw = sessionStorage.getItem("simulation_session");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSession(parsed);
      } catch {
        setSession(null);
      }
    } else {
      setSession(null);
    }
  };

  useEffect(() => {
    checkSimulation();
    window.addEventListener("simulation_changed", checkSimulation);
    window.addEventListener("storage", checkSimulation);

    return () => {
      window.removeEventListener("simulation_changed", checkSimulation);
      window.removeEventListener("storage", checkSimulation);
    };
  }, []);

  useEffect(() => {
    if (!session?.expires_at) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(session.expires_at).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("Expired");
        handleEndSimulation();
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleEndSimulation = async () => {
    setIsEnding(true);
    try {
      await adminService.endSimulation();
    } catch (e) {
      console.warn("Failed to notify backend of simulation stop", e);
    } finally {
      sessionStorage.removeItem("simulation_token");
      sessionStorage.removeItem("simulation_session");
      window.dispatchEvent(new Event("simulation_changed"));
      setSession(null);
      setIsEnding(false);
      navigate("/admin/users");
    }
  };

  if (!session) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white shadow-xl px-4 py-2.5 backdrop-blur-md border-b border-amber-300/30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm shrink-0 border border-white/20">
            <Eye className="h-4 w-4 text-amber-200 animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-black/40 text-amber-200 border-amber-300/40 text-[10px] uppercase font-black tracking-wider">
              VIEW-AS SIMULATION ACTIVE
            </Badge>
            <span className="text-xs font-semibold text-white/90">
              Viewing as candidate:{" "}
              <strong className="text-white underline decoration-amber-300">
                {session.target_user_name || "Target Candidate"}
              </strong>{" "}
              ({session.target_user_email || session.target_user_id})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-black/30 px-2.5 py-1 rounded-md border border-white/10 font-mono text-amber-100">
            <Clock className="h-3.5 w-3.5 text-amber-300" />
            <span>Expires in: {timeLeft || "Calculating..."}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] bg-red-950/50 text-red-200 px-2 py-1 rounded border border-red-400/30">
            <AlertTriangle className="h-3 w-3 text-red-300" />
            <span>Read Only &bull; Mutations Blocked</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isEnding}
            onClick={handleEndSimulation}
            className="h-7 px-3 text-xs bg-white text-zinc-900 hover:bg-zinc-100 font-bold border-0 shadow-sm gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>{isEnding ? "Ending..." : "Exit View-As"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
