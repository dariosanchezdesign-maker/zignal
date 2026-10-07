"use client";

import clsx from "clsx";
import type { QueryOutcome } from "@/lib/model/types";

/** Compact "#2" / "Mentioned only" / "Not mentioned" pill for tables. */
export function PositionPill({ outcome, size = "sm" }: { outcome: QueryOutcome; size?: "sm" | "md" }) {
  const you = outcome.you;
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[11.5px]" : "px-2 py-0.5 text-[12px]";
  if (you?.position) {
    return (
      <span
        className={clsx(
          "num inline-flex items-center rounded-md font-semibold",
          cls,
          you.position === 1 ? "bg-positive-50 text-positive" : you.position <= 3 ? "bg-accent-50 text-accent-700" : "bg-caution-50 text-caution",
        )}
      >
        #{you.position}
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-md font-medium", cls, you ? "bg-ink-100 text-ink-600" : "bg-negative-50 text-negative")}>
      {you ? "Mentioned only" : "Not mentioned"}
    </span>
  );
}
