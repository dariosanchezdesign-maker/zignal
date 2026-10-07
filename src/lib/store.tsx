"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Insight, InsightStatus } from "./model/types";
import { DEMO_RECORDS } from "./demo";
import { buildWorkspace, type InsightState, type Workspace, type WorkspaceRecord } from "./engine/workspace";

// Client store. In this V1 the repository is local: workspace records and
// user actions persist to localStorage, and every derived number is rebuilt by
// the engine. A backend replaces this file's persistence, not the engine.

export type RangeDays = 7 | 30 | 90;

export interface Account {
  name: string;
  email: string;
}

interface PersistedState {
  account: Account | null;
  records: WorkspaceRecord[]; // user-created workspaces
  demoRuns: Record<string, string[]>; // manual simulations on demo workspaces
  insightState: Record<string, Record<string, InsightState>>; // by business id
  activeId: string;
  range: RangeDays;
  pendingScanId: string | null;
}

const KEY = "zignal:v2";

const initial: PersistedState = {
  account: null,
  records: [],
  demoRuns: {},
  insightState: {},
  activeId: DEMO_RECORDS[0].business.id,
  range: 30,
  pendingScanId: null,
};

interface StoreValue extends PersistedState {
  hydrated: boolean;
  workspaces: WorkspaceRecord[];
  ws: Workspace;
  setActive: (id: string) => void;
  setRange: (r: RangeDays) => void;
  signUp: (a: Account) => void;
  signOut: () => void;
  addRecord: (r: WorkspaceRecord) => void;
  updateRecord: (r: WorkspaceRecord) => void;
  removeRecord: (id: string) => void;
  setPendingScan: (id: string | null) => void;
  runSimulation: () => void;
  setInsightStatus: (insight: Insight, status: InsightStatus) => void;
  workspaceFor: (id: string) => Workspace | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* storage unavailable: run in memory */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const workspaces = useMemo(
    () => [...state.records, ...DEMO_RECORDS.map((r) => ({ ...r, manual_runs: state.demoRuns[r.business.id] ?? [] }))],
    [state.records, state.demoRuns],
  );
  const activeRecord = workspaces.find((w) => w.business.id === state.activeId) ?? workspaces[0];
  const activeInsights = state.insightState[activeRecord.business.id];
  const ws = useMemo(() => buildWorkspace(activeRecord, activeInsights ?? {}), [activeRecord, activeInsights]);

  const workspaceFor = useCallback(
    (id: string) => {
      const r = workspaces.find((w) => w.business.id === id);
      return r ? buildWorkspace(r, state.insightState[id] ?? {}) : null;
    },
    [workspaces, state.insightState],
  );

  const value: StoreValue = {
    ...state,
    hydrated,
    workspaces,
    ws,
    workspaceFor,
    setActive: (id) => setState((s) => ({ ...s, activeId: id })),
    setRange: (range) => setState((s) => ({ ...s, range })),
    signUp: (account) => setState((s) => ({ ...s, account })),
    signOut: () => setState(() => ({ ...initial })),
    addRecord: (r) => setState((s) => ({ ...s, records: [r, ...s.records.filter((x) => x.business.id !== r.business.id)], activeId: r.business.id })),
    updateRecord: (r) => setState((s) => ({ ...s, records: s.records.map((x) => (x.business.id === r.business.id ? r : x)) })),
    removeRecord: (id) =>
      setState((s) => ({
        ...s,
        records: s.records.filter((x) => x.business.id !== id),
        activeId: s.activeId === id ? DEMO_RECORDS[0].business.id : s.activeId,
      })),
    setPendingScan: (id) => setState((s) => ({ ...s, pendingScanId: id })),
    runSimulation: () =>
      setState((s) => {
        const id = activeRecord.business.id;
        const now = new Date().toISOString();
        if (activeRecord.business.is_demo) return { ...s, demoRuns: { ...s.demoRuns, [id]: [...(s.demoRuns[id] ?? []), now] } };
        return { ...s, records: s.records.map((r) => (r.business.id === id ? { ...r, manual_runs: [...r.manual_runs, now] } : r)) };
      }),
    setInsightStatus: (insight, status) =>
      setState((s) => {
        const bid = activeRecord.business.id;
        const current = s.insightState[bid] ?? {};
        const entry: InsightState =
          status === "completed"
            ? { status, completed_at_index: ws.latest.index, targets: insight.target_attributes, snapshot: { ...insight, status } }
            : { status };
        return { ...s, insightState: { ...s.insightState, [bid]: { ...current, [insight.id]: entry } } };
      }),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
