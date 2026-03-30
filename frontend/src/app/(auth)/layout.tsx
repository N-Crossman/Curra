export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -10%, #3DDB6F14 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="mb-8 flex flex-col items-center gap-1">
          <span className="text-3xl font-display text-foreground tracking-tight">
            Curra
          </span>
          <span className="text-xs text-subtle">Your health, managed.</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-glow-md">
          {children}
        </div>
      </div>
    </div>
  );
}
