import React from "react";
import { reportEvent } from "@/lib/monitoring";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportEvent("ui_error");
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main
          className="min-h-dvh flex items-center justify-center p-6"
          style={{
            backgroundColor: "var(--color-background, #f3f5fa)",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border p-8 md:p-10 text-center shadow-sm space-y-6"
            style={{
              backgroundColor: "var(--color-surface, #fff)",
              borderColor: "var(--color-border, #ccd3e1)",
            }}
          >
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-error, #b52d3a) 9%, transparent)",
                color: "var(--color-error, #b52d3a)",
              }}
              aria-hidden="true"
            >
              ⚠
            </div>

            <h1
              ref={(el) => el?.focus()}
              tabIndex={-1}
              className="text-2xl md:text-3xl font-bold tracking-tight outline-none"
              style={{ color: "var(--color-text, #17243c)" }}
              role="alert"
            >
              Something went wrong
            </h1>

            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--color-textSecondary, #52617c)" }}
            >
              An unexpected error occurred while rendering this page. Public
              portfolio content may still be available.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details
                className="rounded-lg border p-3 text-left text-xs"
                style={{
                  borderColor: "var(--color-border, #ccd3e1)",
                  backgroundColor: "var(--color-background, #f3f5fa)",
                  color: "var(--color-textSecondary, #52617c)",
                }}
              >
                <summary className="font-medium cursor-pointer mb-2">
                  Error details
                </summary>
                <pre className="overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.resetError}
                className="px-6 py-3 rounded-lg font-bold text-base transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-primary, #244ce4)",
                  color: "var(--color-accent, #fff)",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                className="px-6 py-3 rounded-lg font-medium text-base border transition-opacity hover:opacity-80"
                style={{
                  borderColor: "var(--color-border, #ccd3e1)",
                  color: "var(--color-text, #17243c)",
                }}
              >
                Go home
              </a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
