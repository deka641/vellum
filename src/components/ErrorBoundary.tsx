"use client";

import { Component, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  resetKey?: string;
  silent?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.silent) return null;

      if (this.props.fallback) return this.props.fallback;

      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h3 className={styles.title}>Something went wrong</h3>
            <p className={styles.message}>
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button className={styles.button} onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function BlockErrorFallback({ onDelete }: { onDelete?: () => void }) {
  return (
    <div className={styles.blockError}>
      <span>This block couldn&apos;t be rendered</span>
      {onDelete && (
        <button className={styles.deleteBtn} onClick={onDelete}>
          Remove block
        </button>
      )}
    </div>
  );
}
