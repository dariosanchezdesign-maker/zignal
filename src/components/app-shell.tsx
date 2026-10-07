"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  Bell,
  Check,
  ChevronsUpDown,
  FileText,
  LayoutGrid,
  ListChecks,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Swords,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { getIndustry } from "@/lib/industries";
import { Logo, TrustLabel } from "./ui";
import type { Business } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { SimulationControl } from "./simulation-control";

const NAV = [
  { href: "/app", label: "Home", icon: LayoutGrid },
  { href: "/app/queries", label: "Questions", icon: MessageSquare },
  { href: "/app/competitors", label: "Competitors", icon: Swords },
  { href: "/app/opportunities", label: "Next steps", icon: ListChecks },
];

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { ws, hydrated } = useStore();
  const active = ws.business;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-ink-150 bg-canvas lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" className="focus-ring rounded-md">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 pt-2">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} active={isActive(path, n.href)} />
          ))}
          <div className="!my-4 mx-2.5 h-px bg-ink-150" />
          <NavLink href="/app/visibility" label="Full analysis" icon={BarChart3} active={path.startsWith("/app/visibility")} />
        </nav>
      </aside>

      <div className="lg:pl-[232px]">
        <TopBar />
        {hydrated && active.is_demo && (
          <div className="no-print border-b border-caution-100 bg-caution-50/60">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-2 text-[12.5px] text-ink-600 sm:px-8">
              <span className="flex items-center gap-2">
                <TrustLabel kind="demo" />
                <span className="hidden sm:inline">Fictional business. Results are simulated AI tests, not live AI answers.</span>
              </span>
              <Link href="/signup" className="shrink-0 font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
                Scan your business
              </Link>
            </div>
          </div>
        )}
        {hydrated && !active.is_demo && (
          <div className="no-print border-b border-ink-150 bg-white/60">
            <div className="mx-auto max-w-[1240px] px-4 py-2 text-[12.5px] text-ink-500 sm:px-8">
              Results are simulated AI tests, not live AI answers yet.
            </div>
          </div>
        )}
        <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:pb-16">{hydrated ? children : <ShellSkeleton />}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
        active ? "bg-white font-medium text-ink-900 shadow-card ring-1 ring-ink-150" : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
      )}
    >
      <Icon className={clsx("h-4 w-4", active ? "text-ink-900" : "text-ink-400")} strokeWidth={1.9} />
      {label}
    </Link>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-ink-100" />
      <div className="h-56 animate-pulse rounded-2xl bg-ink-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [onClose]);
  return ref;
}

function TopBar() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-ink-150 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-8">
        <Link href="/app" className="mr-1 lg:hidden" aria-label="Zignal home">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <rect width="22" height="22" rx="6" className="fill-ink-900" />
            <rect x="5" y="12" width="2.6" height="5" rx="1" fill="#fff" opacity=".45" />
            <rect x="9.7" y="8.5" width="2.6" height="8.5" rx="1" fill="#fff" opacity=".7" />
            <rect x="14.4" y="5" width="2.6" height="12" rx="1" className="fill-accent-500" />
          </svg>
        </Link>
        <BusinessSelector />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SimulationControl variant="button" />
          <Notifications />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function BusinessSelector() {
  const router = useRouter();
  const { workspaces: records, ws, setActive, account } = useStore();
  const active = ws.business;
  const workspaces = records.map((r) => r.business);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const ind = getIndustry(active.industry);
  const own = workspaces.filter((w) => !w.is_demo);
  const demos = workspaces.filter((w) => w.is_demo);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen(!open)}
        className="focus-ring flex min-w-0 max-w-[60vw] items-center gap-2.5 rounded-[10px] border border-ink-150 bg-white py-1.5 pl-2 pr-2.5 text-left shadow-card transition-colors hover:border-ink-300 sm:max-w-none"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-50 text-[15px]">{ind.emoji}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold leading-tight">{active.name}</span>
          <span className="block truncate text-[11.5px] leading-tight text-ink-500">
            {ind.label} · {active.location}
          </span>
        </span>
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-ink-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[300px] animate-fade-up overflow-hidden rounded-xl border border-ink-150 bg-white shadow-pop">
          {own.length > 0 && (
            <Group label="Your businesses">
              {own.map((w) => (
                <WorkspaceItem key={w.id} w={w} active={w.id === active.id} onClick={() => (setActive(w.id), setOpen(false))} />
              ))}
            </Group>
          )}
          <Group label="Demo workspaces">
            {demos.map((w) => (
              <WorkspaceItem key={w.id} w={w} active={w.id === active.id} onClick={() => (setActive(w.id), setOpen(false))} />
            ))}
          </Group>
          <button
            onClick={() => router.push(account ? "/onboarding" : "/signup")}
            className="flex w-full items-center gap-2 border-t border-ink-150 px-3.5 py-3 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
          >
            <Plus className="h-4 w-4" /> Add a business
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-1.5">
      <div className="eyebrow px-2 pb-1 pt-1.5">{label}</div>
      {children}
    </div>
  );
}

function WorkspaceItem({ w, active, onClick }: { w: Business; active: boolean; onClick: () => void }) {
  const ind = getIndustry(w.industry);
  return (
    <button onClick={onClick} className={clsx("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink-50", active && "bg-ink-50")}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[14px] ring-1 ring-ink-150">{ind.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{w.name}</span>
        <span className="block truncate text-[11.5px] text-ink-500">
          {ind.label} · {w.location}
        </span>
      </span>
      {active && <Check className="h-4 w-4 text-ink-900" />}
    </button>
  );
}

function Notifications() {
  const { ws } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const items = buildNotifications(ws);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-600 hover:bg-ink-100"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-600 ring-2 ring-canvas" />
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 animate-fade-up overflow-hidden rounded-xl border border-ink-150 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-ink-150 px-4 py-3">
            <span className="text-[13px] font-semibold">Visibility alerts</span>
            <TrustLabel kind="simulated" />
          </div>
          <ul className="max-h-[60vh] divide-y divide-ink-100 overflow-auto">
            {items.map((n, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.tone === "neg" ? "bg-negative" : n.tone === "pos" ? "bg-positive" : "bg-ink-300")} />
                <div>
                  <p className="text-[13px] leading-snug text-ink-800">{n.text}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{n.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function buildNotifications(ws: Workspace) {
  const out: { text: string; when: string; tone: "pos" | "neg" | "neutral" }[] = [];
  const h = ws.history;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (h.length >= 2) {
    const d = h[h.length - 1].score - h[h.length - 2].score;
    out.push({
      text: d === 0 ? `AI Visibility Score unchanged at ${ws.you.score} in the latest simulation` : `AI Visibility Score ${d > 0 ? "rose" : "fell"} ${Math.abs(d)} pts to ${ws.you.score}`,
      when: fmt(ws.latest.run_date),
      tone: d > 0 ? "pos" : d < 0 ? "neg" : "neutral",
    });
  }
  const threat = ws.insights.find((i) => i.type === "competitive-threat");
  if (threat) out.push({ text: threat.observation, when: fmt(ws.latest.run_date), tone: "neg" });
  const open = ws.insights.filter((i) => i.status !== "completed").length;
  out.push({ text: `${open} open opportunities from the latest simulation`, when: fmt(ws.latest.run_date), tone: "neutral" });
  out.push({ text: `Simulation complete: ${ws.queries.length} queries tested`, when: fmt(ws.latest.run_date), tone: "neutral" });
  return out;
}

function AccountMenu() {
  const router = useRouter();
  const { account, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const initials = account ? account.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "G";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-[11.5px] font-semibold text-white"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 animate-fade-up overflow-hidden rounded-xl border border-ink-150 bg-white shadow-pop">
          <div className="border-b border-ink-150 px-4 py-3">
            <div className="truncate text-[13px] font-semibold">{account?.name ?? "Guest"}</div>
            <div className="truncate text-[12px] text-ink-500">{account?.email ?? "Exploring demo workspaces"}</div>
          </div>
          <div className="p-1.5">
            <MenuItem onClick={() => (router.push("/app/visibility"), setOpen(false))} icon={BarChart3}>
              Full analysis
            </MenuItem>
            <MenuItem onClick={() => (router.push("/app/reports"), setOpen(false))} icon={FileText}>
              Reports
            </MenuItem>
            <MenuItem onClick={() => (router.push("/app/settings"), setOpen(false))} icon={Settings}>
              Settings
            </MenuItem>
            {account ? (
              <MenuItem
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                icon={LogOut}
              >
                Sign out
              </MenuItem>
            ) : (
              <MenuItem onClick={() => router.push("/signup")} icon={Plus}>
                Create account
              </MenuItem>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, icon: Icon, children }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-ink-50">
      <Icon className="h-4 w-4 text-ink-400" />
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mobile: bottom tab bar with the four primary destinations + a "More" sheet.

function MobileTabBar() {
  const path = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink-150 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-4">
        {NAV.map((n) => {
          const a = isActive(path, n.href);
          return (
            <Link key={n.href} href={n.href} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", a ? "text-ink-900" : "text-ink-400")}>
              <n.icon className="h-5 w-5" strokeWidth={a ? 2.2 : 1.8} />
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
