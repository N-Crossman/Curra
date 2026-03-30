"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";

const DEMO_EMAIL = "demo.patient@curra.com";
const DEMO_PASSWORD = "Demo1234!";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Demo login failed. Make sure the backend is running.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display text-foreground tracking-tight">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-subtle">
          Enter your credentials to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded border border-border bg-black px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-green/50 focus:ring-1 focus:ring-green/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-green px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleDemo}
        disabled={loading}
        className="w-full rounded border border-border bg-transparent px-4 py-2.5 text-sm text-subtle transition-colors hover:border-green/30 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue as demo patient
      </button>

      <p className="text-center text-xs text-muted">
        No account?{" "}
        <Link href="/register" className="text-green hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
