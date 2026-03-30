"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ApiError, type UserRole } from "@/lib/api";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "patient", label: "Patient", description: "Track your own health" },
  { value: "doctor", label: "Doctor", description: "Manage your patients" },
  { value: "pharmacist", label: "Pharmacist", description: "Review medications" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ full_name: fullName, email, password, role });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display text-foreground tracking-tight">
          Create account
        </h1>
        <p className="mt-1 text-sm text-subtle">
          Get started with Curra today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="full-name" className="block text-xs font-medium text-subtle uppercase tracking-wider">
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className="w-full rounded border border-border bg-black px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-medium text-subtle uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border border-border bg-black px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-subtle uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded border border-border bg-black px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20"
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-subtle uppercase tracking-wider">
            I am a
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ROLES.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded border px-3 py-2.5 text-left transition-colors ${
                  role === value
                    ? "border-green/50 bg-green/10 text-foreground"
                    : "border-border bg-transparent text-subtle hover:border-muted hover:text-foreground"
                }`}
              >
                <span className="block text-sm font-medium leading-none mb-0.5">
                  {label}
                </span>
                <span className="block text-[11px] text-muted leading-none">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-green px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
