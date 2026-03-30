"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  FlaskConical,
  Activity,
  Users,
  MessageSquare,
  BookOpen,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/labs", label: "Lab Results", icon: FlaskConical },
  { href: "/vitals", label: "Vitals", icon: Activity },
  { href: "/doctors", label: "My Doctors", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/journal", label: "Journal", icon: BookOpen },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <header className="flex md:hidden h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <span className="font-display text-xl text-foreground tracking-tight">Curra</span>
        {user && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green/15 text-xs font-medium text-green">
            {user.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
        )}
      </header>

      <aside className="hidden md:flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center px-5 border-b border-border">
          <span className="font-display text-xl text-foreground tracking-tight">Curra</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={clsx(
                      "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-green/10 text-green"
                        : "text-subtle hover:bg-border hover:text-foreground"
                    )}
                  >
                    <Icon size={15} className={clsx("shrink-0", active ? "text-green" : "text-muted")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green/15 text-xs font-medium text-green">
              {user?.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground leading-none mb-0.5">{user?.full_name}</p>
              <p className="truncate text-[11px] text-muted capitalize leading-none">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-border hover:text-foreground"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-border bg-surface">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-green" : "text-muted hover:text-subtle"
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="leading-none">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
