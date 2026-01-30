interface SessionErrorProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SessionError({
  title,
  message,
  actionLabel,
  onAction,
}: SessionErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="text-2xl font-semibold text-spelling-text">{title}</h2>
        <p className="text-spelling-text-muted">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-6 py-2 rounded-lg bg-spelling-primary text-spelling-surface hover:bg-spelling-primary-hover transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
