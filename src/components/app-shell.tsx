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
  ListFilter,
  LogOut,
  MoreHorizontal,
  Plus,
  Settings,
  Swords,
  Target,
  X,
} from "lucide-react";
import { useStore, type RangeDays } from "@/lib/store";
import { getIndustry } from "@/lib/industries";
import { DemoBadge, Logo, Segmented } from "./ui";
import type { ScanResult } from "@/lib/types";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/visibility", label: "AI Visibility", icon: BarChart3 },
  { href: "/app/queries", label: "Queries", icon: ListFilter },
  { href: "/app/competitors", label: "Competitors", icon: Swords },
  { href: "/app/opportunities", label: "Opportunities", icon: Target },
  { href: "/app/reports", label: "Reports", icon: FileText },
];

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { active, hydrated } = useStore();

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
          <NavLink href="/app/settings" label="Settings" icon={Settings} active={path.startsWith("/app/settings")} />
        </nav>
        <div className="m-3 rounded-xl border border-ink-150 bg-white p-3.5">
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
            </span>
            Monitoring active
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-500">Questions re-tested daily. Next scan in 6h.</p>
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <TopBar />
        {hydrated && active.isDemo && (
          <div className="no-print border-b border-caution-100 bg-caution-50/60">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-2 text-[12.5px] text-ink-600 sm:px-8">
              <span className="flex items-center gap-2">
                <DemoBadge />
                <span className="hidden sm:inline">Fictional business with simulated data — switch businesses to see how each industry changes.</span>
              </span>
              <Link href="/signup" className="shrink-0 font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
                Scan your business
              </Link>
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
  const { range, setRange } = useStore();
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
          <div className="hidden md:block">
            <Segmented<RangeDays>
              value={range}
              onChange={setRange}
              options={[
                { value: 7, label: "7d" },
                { value: 30, label: "30d" },
                { value: 90, label: "90d" },
              ]}
            />
          </div>
          <Notifications />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function BusinessSelector() {
  const router = useRouter();
  const { workspaces, active, setActive, account } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const ind = getIndustry(active.industry);
  const own = workspaces.filter((w) => !w.isDemo);
  const demos = workspaces.filter((w) => w.isDemo);

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

function WorkspaceItem({ w, active, onClick }: { w: ScanResult["business"]; active: boolean; onClick: () => void }) {
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
  const { scan } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const items = buildNotifications(scan);

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
            <span className="text-[11.5px] text-ink-400">Last 7 days</span>
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

function buildNotifications(scan: ScanResult) {
  const out: { text: string; when: string; tone: "pos" | "neg" | "neutral" }[] = [];
  const down = scan.queries.find((q) => q.delta < 0 && q.winnerId !== "you");
  const up = scan.queries.find((q) => q.delta > 0);
  if (down) out.push({ text: `${down.winnerName} moved ahead of you on “${down.text}”`, when: "2 hours ago", tone: "neg" });
  if (up) out.push({ text: `You moved up to #${up.position} on “${up.text}”`, when: "Yesterday", tone: "pos" });
  const opp = scan.opportunities[0];
  if (opp) out.push({ text: `New high-impact opportunity: ${opp.title}`, when: "2 days ago", tone: "neutral" });
  out.push({ text: `Weekly scan complete — ${scan.queries.length} questions re-tested`, when: "3 days ago", tone: "neutral" });
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
  const [more, setMore] = useState(false);
  const { range, setRange } = useStore();
  const primary = [NAV[0], NAV[1], NAV[2], NAV[4]];
  const secondary = [NAV[3], NAV[5], { href: "/app/settings", label: "Settings", icon: Settings }];
  const moreActive = secondary.some((n) => isActive(path, n.href));

  useEffect(() => setMore(false), [path]);

  return (
    <>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink-150 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {primary.map((n) => {
            const a = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium", a ? "text-ink-900" : "text-ink-400")}>
                <n.icon className="h-5 w-5" strokeWidth={a ? 2.2 : 1.8} />
                {n.label === "AI Visibility" ? "Visibility" : n.label}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium", moreActive ? "text-ink-900" : "text-ink-400")}>
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/30" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-pop">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="text-[15px] font-semibold">More</span>
              <button onClick={() => setMore(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-ink-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3">
              {secondary.map((n) => (
                <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] hover:bg-ink-50">
                  <n.icon className="h-5 w-5 text-ink-500" />
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="mx-5 mt-3 flex items-center justify-between border-t border-ink-150 pt-4">
              <span className="text-[13px] text-ink-500">Date range</span>
              <Segmented<RangeDays>
                value={range}
                onChange={setRange}
                options={[
                  { value: 7, label: "7 days" },
                  { value: 30, label: "30 days" },
                  { value: 90, label: "90 days" },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
