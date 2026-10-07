"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Intent, Level, OpportunityStatus } from "@/lib/types";

export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const fmtPos = (n: number | null) => (n === null ? "—" : n.toFixed(1));

export const INTENT_LABEL: Record<Intent, string> = {
  discovery: "Discovery",
  comparison: "Comparison",
  "high-intent": "High intent",
  local: "Local",
  transactional: "Transactional",
  problem: "Problem-based",
};

export const INTENT_HINT: Record<Intent, string> = {
  discovery: "Exploring options",
  comparison: "Weighing alternatives",
  "high-intent": "Ready to choose",
  local: "Looking nearby",
  transactional: "Ready to book or buy",
  problem: "Trying to solve something",
};

// ---------------------------------------------------------------------------

export function Logo({ className, mono }: { className?: string; mono?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect width="22" height="22" rx="6" className={mono ? "fill-white" : "fill-ink-900"} />
        <rect x="5" y="12" width="2.6" height="5" rx="1" className={mono ? "fill-ink-900" : "fill-white"} opacity=".45" />
        <rect x="9.7" y="8.5" width="2.6" height="8.5" rx="1" className={mono ? "fill-ink-900" : "fill-white"} opacity=".7" />
        <rect x="14.4" y="5" width="2.6" height="12" rx="1" className="fill-accent-500" />
      </svg>
      <span className={clsx("text-[15px] font-semibold tracking-tight", mono ? "text-white" : "text-ink-900")}>Zignal</span>
    </span>
  );
}

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: ButtonProps) {
  const cls = clsx(
    "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40",
    {
      "bg-ink-900 text-white hover:bg-ink-800 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_1px_2px_rgba(14,17,22,0.2)]": variant === "primary",
      "bg-accent-600 text-white hover:bg-accent-700 shadow-[0_1px_2px_rgba(38,71,201,0.3)]": variant === "accent",
      "border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50": variant === "secondary",
      "text-ink-600 hover:bg-ink-100 hover:text-ink-900": variant === "ghost",
      "h-8 px-3 text-[13px]": size === "sm",
      "h-10 px-4 text-sm": size === "md",
      "h-12 px-5 text-[15px]": size === "lg",
    },
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

type Tone = "neutral" | "accent" | "positive" | "caution" | "negative" | "ink";

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium leading-4",
        {
          "bg-ink-100 text-ink-600": tone === "neutral",
          "bg-accent-50 text-accent-700": tone === "accent",
          "bg-positive-50 text-positive": tone === "positive",
          "bg-caution-50 text-caution": tone === "caution",
          "bg-negative-50 text-negative": tone === "negative",
          "bg-ink-900 text-white": tone === "ink",
        },
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ImpactBadge({ level, prefix = "" }: { level: Level; prefix?: string }) {
  const tone: Tone = level === "high" ? "negative" : level === "medium" ? "caution" : "neutral";
  return (
    <Badge tone={tone} dot>
      {prefix}
      {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"}
    </Badge>
  );
}

export function IntentBadge({ intent }: { intent: Intent }) {
  return <Badge tone="neutral">{INTENT_LABEL[intent]}</Badge>;
}

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  const tone: Tone = status === "completed" ? "positive" : status === "in-progress" ? "accent" : "neutral";
  return (
    <Badge tone={tone} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border border-caution-100 bg-caution-50 px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider text-caution",
        className,
      )}
    >
      Demo workspace
    </span>
  );
}

export function Delta({ value, suffix = "", invert = false, className }: { value: number; suffix?: string; invert?: boolean; className?: string }) {
  const good = invert ? value < 0 : value > 0;
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={clsx(
        "num inline-flex items-center gap-0.5 text-[12px] font-medium",
        value === 0 ? "text-ink-400" : good ? "text-positive" : "text-negative",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function Meter({ value, tone = "ink", className, size = "md" }: { value: number; tone?: "ink" | "accent" | "muted"; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={clsx("w-full overflow-hidden rounded-full bg-ink-100", size === "sm" ? "h-1" : "h-1.5", className)}>
      <div
        className={clsx("h-full rounded-full transition-[width] duration-700 ease-out", {
          "bg-ink-800": tone === "ink",
          "bg-accent-600": tone === "accent",
          "bg-ink-300": tone === "muted",
        })}
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function ScoreRing({ score, size = 168, stroke = 10, label = true }: { score: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-accent-600 transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[44px] font-semibold leading-none tracking-tight" style={{ fontSize: size * 0.27 }}>
            {score}
          </span>
          <span className="num mt-1 text-xs text-ink-400">/ 100</span>
        </div>
      )}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-ink-150 bg-ink-50 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={clsx(
            "focus-ring rounded-[8px] font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13px]",
            value === o.value ? "bg-white text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EntityAvatar({ name, you, size = 28 }: { name: string; you?: boolean; size?: number }) {
  const initials = name
    .replace(/^(The|Hotel|La|El)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold",
        you ? "bg-accent-600 text-white" : "bg-ink-100 text-ink-600",
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || name[0]}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,#EFF0F2_0%,#F6F7F8_50%,#EFF0F2_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
