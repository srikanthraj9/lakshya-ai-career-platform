import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { telemetryService } from "@/services/telemetryService";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    telemetryService.error("SYSTEM_INFO", "Uncaught component error in AppErrorBoundary", {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="glass-card gradient-border max-w-md w-full rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-lg">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold text-foreground">
                {this.props.fallbackTitle || "Workspace Error Encountered"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {this.props.fallbackMessage ||
                  "A temporary component issue occurred. The rest of Lakshya AI remains active and unaffected."}
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="rounded-xl bg-secondary/50 p-3 text-left overflow-x-auto max-h-28 text-[10px] text-muted-foreground font-mono">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                className="rounded-xl text-xs gap-1.5"
              >
                <Home className="h-3.5 w-3.5" />
                Dashboard
              </Button>
              <Button
                size="sm"
                onClick={this.handleReload}
                className="gradient-primary rounded-xl text-xs text-white gap-1.5 shadow-md shadow-primary/25"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Component
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
