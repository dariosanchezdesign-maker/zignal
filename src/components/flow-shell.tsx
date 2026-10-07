"use client";

import Link from "next/link";
import clsx from "clsx";
import { Logo } from "./ui";

const STEPS = ["Account", "Business", "Scan", "Results"];

export function FlowShell({ step, children, wide }: { step: number; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="focus-ring rounded-md">
          <Logo />
        </Link>
        <ol className="flex items-center gap-1.5 sm:gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5 sm:gap-3">
              <span className={clsx("flex items-center gap-1.5 text-[12px]", i <= step ? "text-ink-900" : "text-ink-400")}>
                <span
                  className={clsx(
                    "num flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-semibold",
                    i < step ? "bg-ink-900 text-white" : i === step ? "bg-white text-ink-900 ring-1 ring-ink-900" : "bg-white text-ink-400 ring-1 ring-ink-200",
                  )}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-3 bg-ink-200 sm:w-6" />}
            </li>
          ))}
        </ol>
      </header>
      <main className={clsx("mx-auto px-5 pb-20 pt-6 sm:px-8 sm:pt-12", wide ? "max-w-3xl" : "max-w-md")}>{children}</main>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  optional,
  group,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  optional?: boolean;
  /** Use for fields containing several controls (chips, input + button). */
  group?: boolean;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-ink-800">
        {label}
        {optional && <span className="text-[12px] font-normal text-ink-400">Optional</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-ink-400">{hint}</span>}
    </Tag>
  );
}

export const inputCls =
  "focus-ring h-11 w-full rounded-[10px] border border-ink-200 bg-white px-3.5 text-[14.5px] text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-ink-400";
