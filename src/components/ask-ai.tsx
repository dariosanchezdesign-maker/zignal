"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowUp, Check, CircleHelp, Sparkles, X } from "lucide-react";
import type { ScanResult } from "@/lib/types";
import { askAboutBusiness, askExamples, type PerceptionAnswer } from "@/lib/engine/ask";
import { EntityAvatar, pct } from "./ui";

const THINKING = ["Reading what AI knows about", "Matching your question to customer intent", "Comparing against competitors", "Checking for missing information"];

export function AskAI({ scan }: { scan: ScanResult }) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<PerceptionAnswer | null>(null);
  const [thinking, setThinking] = useState(-1);
  const examples = askExamples(scan);

  useEffect(() => {
    setAnswer(null);
    setThinking(-1);
    setInput("");
  }, [scan.business.id]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || thinking >= 0) return;
    setInput(q);
    setAnswer(null);
    setThinking(0);
    THINKING.forEach((_, i) => setTimeout(() => setThinking(i), i * 520));
    setTimeout(() => {
      setAnswer(askAboutBusiness(scan, q));
      setThinking(-1);
    }, THINKING.length * 520 + 200);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-7">
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-500">
          <Sparkles className="h-3.5 w-3.5" /> Ask AI about {scan.business.name}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="mt-3 flex items-end gap-2 rounded-xl border border-ink-200 bg-white p-2 pl-4 transition-colors focus-within:border-ink-400"
        >
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder={examples[0]}
            className="min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-400"
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={!input.trim() || thinking >= 0}
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {examples.map((e) => (
            <button
              key={e}
              onClick={() => ask(e)}
              className="focus-ring rounded-full border border-ink-150 bg-ink-50 px-3 py-1.5 text-left text-[12.5px] text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {thinking >= 0 && (
        <div className="card animate-fade-in p-6">
          <ul className="space-y-2.5">
            {THINKING.map((t, i) => (
              <li key={t} className={clsx("flex items-center gap-2.5 text-[13.5px] transition-opacity", i > thinking ? "opacity-30" : "opacity-100")}>
                {i < thinking ? (
                  <Check className="h-3.5 w-3.5 text-ink-900" strokeWidth={3} />
                ) : (
                  <span className={clsx("ml-1 mr-0.5 h-1.5 w-1.5 rounded-full bg-ink-900", i === thinking && "animate-pulsedot")} />
                )}
                {t}
                {i === 0 ? ` ${scan.business.name}` : ""}…
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer && <Perception answer={answer} name={scan.business.name} />}
    </div>
  );
}

function useTypewriter(text: string, speed = 9) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(t), x) : x + 2)), speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return text.slice(0, n);
}

function Perception({ answer, name }: { answer: PerceptionAnswer; name: string }) {
  const typed = useTypewriter(answer.understanding);
  const tone = answer.likelihoodLabel;
  return (
    <div className="space-y-5">
      <div className="card animate-fade-up overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="p-6 sm:p-7">
            <div className="eyebrow">What AI currently understands about your business</div>
            <p className="mt-3 min-h-[96px] text-[16px] leading-relaxed text-ink-800 sm:text-[17px]">
              {typed}
              {typed.length < answer.understanding.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulsedot bg-ink-900" />}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {answer.topics.map((t) => (
                <span key={t.id} className="rounded-md bg-ink-100 px-2 py-0.5 text-[11.5px] font-medium text-ink-600">
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center border-t border-ink-150 bg-ink-50/70 p-6 md:border-l md:border-t-0">
            <div className="eyebrow">Recommendation likelihood</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="num text-[44px] font-semibold leading-none tracking-tight">{answer.likelihood}</span>
              <span className="text-[15px] text-ink-400">%</span>
            </div>
            <div className="mt-3 flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-1.5 flex-1 rounded-full transition-colors duration-500",
                    i < Math.round(answer.likelihood / 10) ? (tone === "high" ? "bg-positive" : tone === "medium" ? "bg-caution" : "bg-negative") : "bg-ink-150",
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-snug text-ink-600">{answer.verdict}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Strengths" delay={150}>
          {answer.strengths.map((s) => (
            <Row key={s} icon={<Check className="h-3.5 w-3.5 text-positive" strokeWidth={2.5} />}>
              {s}
            </Row>
          ))}
        </Panel>
        <Panel title="Weaknesses" delay={250}>
          {answer.weaknesses.map((s) => (
            <Row key={s} icon={<X className="h-3.5 w-3.5 text-negative" strokeWidth={2.5} />}>
              {s}
            </Row>
          ))}
        </Panel>
        <Panel title="Missing information" subtitle={`What AI can't find about ${name}`} delay={350}>
          {answer.missing.map((s) => (
            <Row key={s} icon={<CircleHelp className="h-3.5 w-3.5 text-caution" strokeWidth={2.2} />}>
              {s}
            </Row>
          ))}
        </Panel>
        <Panel title="Competitors AI considers" subtitle="For this kind of question" delay={450}>
          {answer.competitors.length ? (
            answer.competitors.map((c) => (
              <div key={c.name} className="flex items-center gap-3 py-1">
                <EntityAvatar name={c.name} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-500">{c.reason}</div>
                </div>
                <span className="num text-[12.5px] font-semibold text-ink-700">{pct(c.rate)}</span>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-ink-500">No competitor is consistently recommended for this question.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, delay }: { title: string; subtitle?: string; children: React.ReactNode; delay: number }) {
  return (
    <div className="card animate-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3">
        <div className="text-[13.5px] font-semibold">{title}</div>
        {subtitle && <div className="text-[12px] text-ink-400">{subtitle}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-[13.5px] leading-snug text-ink-700">
      <span className="mt-0.5 shrink-0">{icon}</span>
      {children}
    </div>
  );
}
