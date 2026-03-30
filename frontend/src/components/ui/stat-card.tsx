import { clsx } from "clsx";

type Variant = "green" | "amber" | "blue" | "rose";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: Variant;
  meta?: string;
  className?: string;
}

const accentClasses: Record<Variant, string> = {
  green: "bg-green",
  amber: "bg-amber-400",
  blue:  "bg-blue-400",
  rose:  "bg-rose-400",
};

const valueClasses: Record<Variant, string> = {
  green: "text-green",
  amber: "text-amber-400",
  blue:  "text-blue-400",
  rose:  "text-rose-400",
};

export function StatCard({
  label,
  value,
  unit,
  variant = "green",
  meta,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-lg border border-border bg-surface",
        className
      )}
    >
      <div className={clsx("h-0.5 w-full", accentClasses[variant])} />

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </p>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={clsx("text-3xl font-display leading-none", valueClasses[variant])}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted">{unit}</span>
          )}
        </div>

        {meta && (
          <p className="mt-1.5 text-[11px] text-muted">{meta}</p>
        )}
      </div>
    </div>
  );
}
