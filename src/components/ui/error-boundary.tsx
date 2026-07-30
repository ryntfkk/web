"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback kustom; default EmptyState error dengan tombol muat ulang. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Error boundary standar — pasang di root layout & flow kritis (booking, payment). */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="page-h flex items-center justify-center">
            <EmptyState
              variant="error"
              icon={TriangleAlert}
              title="Terjadi Kesalahan"
              description="Maaf, ada yang tidak beres. Coba muat ulang halaman ini."
              action={
                <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
              }
            />
          </div>
        )
      );
    }
    return this.props.children;
  }
}
