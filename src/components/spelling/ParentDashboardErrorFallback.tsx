'use client';

interface ParentDashboardErrorFallbackProps {
  onRetry: () => void;
}

/**
 * Fallback UI for ParentDashboard component when data fetching fails
 */
export function ParentDashboardErrorFallback({ onRetry }: ParentDashboardErrorFallbackProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Unable to Load Dashboard
            </h3>
            <p className="text-red-700 mb-4">
              We couldn't load your dashboard data. This might be a temporary connection issue.
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
