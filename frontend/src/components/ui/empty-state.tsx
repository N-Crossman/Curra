import { clsx } from "clsx";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {emoji && (
        <span className="mb-4 text-4xl leading-none" role="img" aria-hidden>
          {emoji}
        </span>
      )}

      <p className="text-base font-display text-foreground">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-subtle">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
