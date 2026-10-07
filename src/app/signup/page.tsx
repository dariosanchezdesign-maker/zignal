"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { Field, FlowShell, inputCls } from "@/components/flow-shell";
import { useStore } from "@/lib/store";

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  return (
    <FlowShell step={0}>
      <div className="animate-fade-up">
        <h1 className="text-[28px] font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-[15px] text-ink-500">Your first AI visibility scan is free. It takes about a minute.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            signUp({ name: name.trim(), email: email.trim() });
            router.push("/onboarding");
          }}
        >
          <Field label="Full name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="María Rivera" autoComplete="name" autoFocus />
          </Field>
          <Field label="Work email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@yourbusiness.com" autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={!valid}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-ink-150 bg-white p-3.5 text-[12.5px] leading-relaxed text-ink-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Preview build: your account and workspace are stored only in this browser.
        </div>
        <p className="mt-6 text-center text-[13px] text-ink-500">
          Just looking?{" "}
          <a href="/app" className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
            Explore a demo workspace
          </a>
        </p>
      </div>
    </FlowShell>
  );
}
