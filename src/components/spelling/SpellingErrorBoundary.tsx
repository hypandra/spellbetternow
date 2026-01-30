'use client';

import type { ReactNode } from 'react';
import React, { Component } from 'react';
function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return;
  console.warn('SpellingErrorBoundary captured error:', {
    message: error.message,
    context,
  });
}

interface SpellingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
  onNavigate?: () => void;
}

interface SpellingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for spelling MVP features
 * Provides graceful error handling with retry and navigation options
 */
export class SpellingErrorBoundary extends Component<
  SpellingErrorBoundaryProps,
  SpellingErrorBoundaryState
> {
  constructor(props: SpellingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SpellingErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { componentName, onError } = this.props;

    console.error(`SpellingErrorBoundary [${componentName || 'Unknown'}] caught an error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    captureException(error, {
      component: componentName || 'Unknown',
      feature: 'spelling',
      componentStack: errorInfo.componentStack,
    });

    onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleNavigate = (): void => {
    this.props.onNavigate?.();
  };

  override render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="rounded-md border bg-red-50 text-red-900 px-4 py-3">
            <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
            <p className="mb-4">
              The spelling feature encountered an unexpected error. This has been logged for
              debugging.
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                onClick={this.handleNavigate}
              >
                Go Back
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm">Error Details (Dev Only)</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
