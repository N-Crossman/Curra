import { clsx } from "clsx";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-display text-foreground tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
