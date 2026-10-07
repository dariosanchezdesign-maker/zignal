"use client";

import { useMemo, useRef, useState } from "react";
import type { TrendPoint } from "@/lib/types";

const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Single-series trend line with crosshair + tooltip. */
export function TrendChart({ points, height = 200 }: { points: TrendPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { t: 16, r: 12, b: 26, l: 30 };

  const { path, area, xs, ys, ticks } = useMemo(() => {
    const values = points.map((p) => p.score);
    const lo = Math.max(0, Math.floor((Math.min(...values) - 4) / 5) * 5);
    const hi = Math.min(100, Math.ceil((Math.max(...values) + 4) / 5) * 5);
    const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
    const xs = points.map((_, i) => x(i));
    const ys = points.map((p) => y(p.score));
    const path = xs.map((px, i) => `${i ? "L" : "M"}${px.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const area = `${path} L${xs[xs.length - 1].toFixed(1)},${H - pad.b} L${xs[0].toFixed(1)},${H - pad.b} Z`;
    const step = (hi - lo) / 2;
    const ticks = [lo, lo + step, hi].map((v) => ({ v: Math.round(v), y: y(v) }));
    return { path, area, xs, ys, ticks };
  }, [points, H]);

  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  function onMove(e: React.PointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const rel = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    xs.forEach((x, i) => {
      if (Math.abs(x - rel) < Math.abs(xs[best] - rel)) best = i;
    });
    setHover(best);
  }

  const h = hover ?? points.length - 1;

  return (
    <div ref={ref} className="relative w-full select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="AI Visibility Score over time">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2647C9" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2647C9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t.v}>
            <line x1={pad.l} x2={W - pad.r} y1={t.y} y2={t.y} stroke="#EFF0F2" strokeWidth="1" />
            <text x={pad.l - 8} y={t.y + 3.5} textAnchor="end" className="fill-ink-400 font-mono" fontSize="10">
              {t.v}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="#2647C9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => (
          <text
            key={i}
            x={xs[i]}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            className="fill-ink-400 font-mono"
            fontSize="10"
          >
            {fmtDate(points[i].date)}
          </text>
        ))}
        <line x1={xs[h]} x2={xs[h]} y1={pad.t} y2={H - pad.b} stroke="#B6BBC2" strokeDasharray="2 3" opacity={hover === null ? 0 : 1} />
        <circle cx={xs[h]} cy={ys[h]} r="4.5" fill="#2647C9" stroke="#fff" strokeWidth="2" />
      </svg>
      <div
        className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-ink-150 bg-white px-2.5 py-1.5 shadow-lift transition-opacity"
        style={{
          left: `${Math.min(88, Math.max(12, (xs[h] / W) * 100))}%`,
          opacity: hover === null ? 0 : 1,
        }}
      >
        <div className="font-mono text-[10px] text-ink-400">{fmtDate(points[h].date)}</div>
        <div className="num text-sm font-semibold text-ink-900">{points[h].score} <span className="text-ink-400 font-normal">/ 100</span></div>
      </div>
    </div>
  );
}

/** Tiny inline sparkline, no axes. */
export function Sparkline({ values, width = 96, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal comparison bars. The user's business is the only colored mark. */
export function CompareBars({
  rows,
  format = (v) => `${Math.round(v * 100)}%`,
}: {
  rows: { id: string; name: string; value: number; you?: boolean }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.id} className="group grid grid-cols-[minmax(0,9.5rem)_1fr_3rem] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_3rem]" title={`${r.name}: ${format(r.value)}`}>
          <div className={`flex min-w-0 items-center gap-1.5 text-[13px] ${r.you ? "font-semibold text-ink-900" : "text-ink-600"}`}>
            {r.you && <span className="shrink-0 rounded bg-accent-600 px-1 text-[10px] font-semibold leading-4 text-white">You</span>}
            <span className="truncate">{r.name}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-50">
            <div
              className={`h-2 rounded-full transition-[width] duration-700 ease-out ${r.you ? "bg-accent-600" : "bg-ink-300 group-hover:bg-ink-400"}`}
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
            />
          </div>
          <div className="num text-right text-[13px] font-medium text-ink-800">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
