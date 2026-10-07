"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Building2, Hotel, Scale, Search, Sparkles, User, Store, MessageSquare, Star } from "lucide-react";
import { Button, Logo, EntityAvatar } from "@/components/ui";
import { useStore } from "@/lib/store";

const HERO_EXAMPLES = [
  {
    q: "Best boutique hotel in Condado for an anniversary?",
    intro: "For a romantic stay in Condado, these are frequently recommended:",
    list: ["The Solano Condado", "Casa Maré", "Villa Coralina Resort", "Hotel Arenisca"],
    you: 1,
    note: "Ocean-view rooms, rooftop bar, walkable to the beach",
  },
  {
    q: "Best CPA in San Juan for a growing construction company?",
    intro: "Growing construction companies in San Juan often work with:",
    list: ["Montalvo Advisory Group", "Cumbre Advisory", "Cruz Pagán & Associates", "Bayview Tax Partners"],
    you: 2,
    note: "Hands-on advisory for growing companies, bilingual service",
  },
  {
    q: "Where should I invest in Puerto Rico for long-term rental income?",
    intro: "Developers frequently recommended for rental investors:",
    list: ["Isla Capital Development", "Costa Norte Developments", "Palmar Living Group", "Bahía Development Co."],
    you: 0,
    note: "Strong rental-income potential, clear guidance for investors",
  },
];

export default function Landing() {
  const { account, records } = useStore();
  const ctaHref = account ? (records.length ? "/app" : "/onboarding") : "/signup";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-transparent bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="focus-ring rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/app" className="focus-ring hidden rounded-md px-3 py-2 text-sm text-ink-600 hover:text-ink-900 sm:block">
              Example
            </Link>
            <Link href={account ? "/app" : "/signup"} className="focus-ring rounded-md px-3 py-2 text-sm text-ink-600 hover:text-ink-900">
              {account ? "Dashboard" : "Sign in"}
            </Link>
            <Button href={ctaHref} size="sm">
              Check my AI visibility
            </Button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hairline-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pb-28">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-150 bg-white px-3 py-1 text-[12.5px] text-ink-600 shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-600" />
              AI Visibility Intelligence · Now in Puerto Rico
            </div>
            <h1 className="text-balance text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-[54px]">
              Your customers are already asking AI who to choose.
            </h1>
            <p className="mt-5 text-[22px] font-medium tracking-tight text-ink-900 sm:text-[26px]">We show you whether AI chooses you.</p>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">
              AI recommendations are becoming a measurable layer of customer acquisition. See which questions customers ask, who AI recommends, how often it
              recommends you, and what to change.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={ctaHref} size="lg">
                Check My AI Visibility <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/app" size="lg" variant="secondary">
                See an Example
              </Button>
            </div>
            <p className="mt-5 text-[13px] text-ink-400">Free simulated scan · Results in about a minute · No credit card</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* THE SHIFT */}
      <section className="border-y border-ink-150 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <div className="eyebrow mb-3">The shift</div>
            <h2 className="text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[40px]">Search is becoming conversation.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
              Google created an economy around search rankings. AI is creating an economy around recommendations. An answer usually names only a
              handful of businesses, and that shortlist can be measured: how often you appear, where you rank, and who wins instead.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <Flow
              label="Traditional"
              muted
              steps={[
                { icon: User, label: "Customer" },
                { icon: Search, label: "Google" },
                { icon: ListIcon, label: "10 blue links" },
                { icon: Store, label: "Business" },
              ]}
              caption="Customers compare many results and choose for themselves."
            />
            <Flow
              label="Emerging"
              steps={[
                { icon: User, label: "Customer" },
                { icon: MessageSquare, label: "AI" },
                { icon: Star, label: "Recommendation" },
                { icon: Store, label: "Business" },
              ]}
              caption="AI chooses for them. If you're not in the answer, you're not in the decision."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="eyebrow mb-3">How it works</div>
        <h2 className="max-w-xl text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[40px]">From invisible to recommended.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-150 bg-ink-150 md:grid-cols-3">
          {[
            { n: "01", t: "Ask", d: "We generate the questions your customers are asking AI.", ex: "“Best law firms in Puerto Rico for startups”" },
            { n: "02", t: "Measure", d: "We see whether AI recommends you, where you rank, and who beats you.", ex: "Position #3 · Competitor wins 72%" },
            { n: "03", t: "Improve", d: "We tell you what to change to increase your AI visibility.", ex: "Publish a startup-advisory page · +9 pts" },
          ].map((s) => (
            <div key={s.n} className="bg-white p-7 sm:p-8">
              <div className="num font-mono text-[13px] text-accent-600">{s.n}</div>
              <div className="mt-6 text-[22px] font-semibold tracking-tight">{s.t}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{s.d}</p>
              <div className="mt-6 rounded-lg border border-ink-150 bg-ink-50 px-3 py-2 font-mono text-[11.5px] text-ink-500">{s.ex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="border-y border-ink-150 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="eyebrow mb-3">Built for high-value businesses</div>
          <h2 className="max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[40px]">
            Where one recommendation is worth a client.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: Building2, t: "Real Estate", d: "Know which properties, neighborhoods and services AI recommends.", q: "Where should I buy an investment property in San Juan?" },
              { icon: Scale, t: "Professional Services", d: "Know which firms AI trusts when customers ask for expertise.", q: "Who should I hire for a real estate dispute in Puerto Rico?" },
              { icon: Hotel, t: "Hospitality", d: "Know where your hotel, restaurant or experience appears in AI recommendations.", q: "Best beachfront hotels near San Juan" },
            ].map((c) => (
              <div key={c.t} className="group flex flex-col rounded-2xl border border-ink-150 bg-canvas p-7 transition-shadow hover:shadow-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-ink-150">
                  <c.icon className="h-5 w-5 text-ink-700" strokeWidth={1.75} />
                </div>
                <div className="mt-6 text-[19px] font-semibold tracking-tight">{c.t}</div>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-600">{c.d}</p>
                <div className="mt-6 border-t border-ink-150 pt-4 text-[13px] italic text-ink-500">“{c.q}”</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-7 py-14 text-center sm:px-14 sm:py-20">
          <div className="hairline-grid pointer-events-none absolute inset-0 opacity-[0.35] invert" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[46px]">
              Become the business AI recommends.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] text-ink-300">See what AI says about you today. It takes about a minute.</p>
            <div className="mt-9 flex justify-center">
              <Link
                href={ctaHref}
                className="focus-ring inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-6 text-[15px] font-medium text-ink-900 transition-colors hover:bg-ink-100"
              >
                Check My AI Visibility <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-150">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-[13px] text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>AI Visibility Intelligence · San Juan, Puerto Rico · Example businesses shown are fictional.</p>
        </div>
      </footer>
    </div>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function Flow({
  label,
  steps,
  caption,
  muted,
}: {
  label: string;
  steps: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string }[];
  caption: string;
  muted?: boolean;
}) {
  return (
    <div className={clsx("rounded-2xl border p-6 sm:p-8", muted ? "border-ink-150 bg-canvas" : "border-ink-900 bg-ink-900 text-white")}>
      <div className={clsx("eyebrow", !muted && "text-ink-300")}>{label}</div>
      <div className="mt-7 flex items-center justify-between gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={clsx(
                  "flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12",
                  muted ? "bg-white ring-1 ring-ink-150" : i === 2 ? "bg-accent-600" : "bg-white/10 ring-1 ring-white/15",
                )}
              >
                <s.icon className={clsx("h-5 w-5", muted ? "text-ink-500" : "text-white")} strokeWidth={1.75} />
              </div>
              <span className={clsx("whitespace-nowrap text-[11.5px] sm:text-[12.5px]", muted ? "text-ink-500" : "text-ink-200")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx("mb-6 h-px flex-1", muted ? "bg-ink-200" : "bg-white/25")}>
                <div className={clsx("ml-auto -mt-[3px] h-[7px] w-[7px] rotate-45 border-r border-t", muted ? "border-ink-300" : "border-white/40")} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className={clsx("mt-7 text-[14.5px] leading-relaxed", muted ? "text-ink-500" : "text-ink-200")}>{caption}</p>
    </div>
  );
}

function HeroVisual() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HERO_EXAMPLES.length), 5200);
    return () => clearInterval(t);
  }, []);
  const ex = HERO_EXAMPLES[i];

  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="card overflow-hidden shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-ink-150 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-150" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-150" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-150" />
          <span className="ml-3 font-mono text-[11px] text-ink-400">AI assistant</span>
        </div>
        <div key={i} className="space-y-4 p-5 sm:p-6">
          <div className="flex justify-end">
            <div className="max-w-[85%] animate-fade-up rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-[14px] text-white">{ex.q}</div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100">
              <Sparkles className="h-3.5 w-3.5 text-ink-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="animate-fade-in text-[13.5px] text-ink-600 [animation-delay:250ms]">{ex.intro}</p>
              <ol className="mt-3 space-y-1.5">
                {ex.list.map((name, idx) => {
                  const you = idx === ex.you;
                  return (
                    <li
                      key={name}
                      className={clsx(
                        "flex animate-fade-up items-center gap-2.5 rounded-lg px-2.5 py-2",
                        you ? "bg-accent-50 ring-1 ring-inset ring-accent-200" : "ring-1 ring-inset ring-ink-150",
                      )}
                      style={{ animationDelay: `${400 + idx * 140}ms` }}
                    >
                      <span className={clsx("num w-4 text-center text-[12px] font-semibold", you ? "text-accent-700" : "text-ink-400")}>{idx + 1}</span>
                      <EntityAvatar name={name} you={you} size={22} />
                      <span className={clsx("flex-1 truncate text-[13.5px]", you ? "font-semibold text-accent-900" : "text-ink-700")}>{name}</span>
                      {you && <span className="rounded bg-accent-600 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">You</span>}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 animate-fade-in text-[12px] text-ink-400 [animation-delay:1100ms]">Why you: {ex.note}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 border-t border-ink-150 px-5 py-3">
          {HERO_EXAMPLES.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Example ${idx + 1}`}
              onClick={() => setI(idx)}
              className={clsx("h-1 flex-1 rounded-full transition-colors", idx === i ? "bg-ink-800" : "bg-ink-150 hover:bg-ink-200")}
            />
          ))}
        </div>
      </div>

      <div className="absolute -bottom-16 -left-3 hidden w-56 animate-fade-up rounded-xl border border-ink-150 bg-white p-4 shadow-lift [animation-delay:500ms] sm:block lg:-left-10">
        <div className="eyebrow">AI Visibility</div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="num text-[32px] font-semibold leading-none tracking-tight">68</span>
          <span className="text-sm text-ink-400">/ 100</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
          <div>
            <div className="text-ink-400">Mentioned</div>
            <div className="num font-semibold">68%</div>
          </div>
          <div>
            <div className="text-ink-400">Recommended</div>
            <div className="num font-semibold">42%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
