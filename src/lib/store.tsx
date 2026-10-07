"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BusinessProfile, OpportunityStatus, ScanResult } from "./types";
import { DEMO_WORKSPACES } from "./demo";
import { runScan } from "./engine/scan";

// MVP persistence: account + workspaces live in localStorage. The store API is
// the seam where a real backend (auth, scheduled scans) plugs in later.

export type RangeDays = 7 | 30 | 90;

export interface Account {
  name: string;
  email: string;
}

interface PersistedState {
  account: Account | null;
  profiles: BusinessProfile[];
  activeId: string;
  statuses: Record<string, OpportunityStatus>;
  range: RangeDays;
  pendingScanId: string | null;
}

const KEY = "zignal:v1";

const initial: PersistedState = {
  account: null,
  profiles: [],
  activeId: DEMO_WORKSPACES[0].id,
  statuses: {},
  range: 30,
  pendingScanId: null,
};

interface StoreValue extends PersistedState {
  hydrated: boolean;
  workspaces: BusinessProfile[];
  active: BusinessProfile;
  scan: ScanResult;
  setActive: (id: string) => void;
  setRange: (r: RangeDays) => void;
  setStatus: (opportunityId: string, s: OpportunityStatus) => void;
  signUp: (a: Account) => void;
  signOut: () => void;
  addProfile: (p: BusinessProfile) => void;
  updateProfile: (p: BusinessProfile) => void;
  removeProfile: (id: string) => void;
  setPendingScan: (id: string | null) => void;
  scanFor: (id: string) => ScanResult | null;
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
      /* storage unavailable — run in memory */
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

  const workspaces = useMemo(() => [...state.profiles, ...DEMO_WORKSPACES], [state.profiles]);
  const active = workspaces.find((w) => w.id === state.activeId) ?? workspaces[0];
  const scan = useMemo(() => runScan(active, state.statuses), [active, state.statuses]);

  const scanFor = useCallback(
    (id: string) => {
      const p = workspaces.find((w) => w.id === id);
      return p ? runScan(p, state.statuses) : null;
    },
    [workspaces, state.statuses],
  );

  const value: StoreValue = {
    ...state,
    hydrated,
    workspaces,
    active,
    scan,
    scanFor,
    setActive: (id) => setState((s) => ({ ...s, activeId: id })),
    setRange: (range) => setState((s) => ({ ...s, range })),
    setStatus: (id, st) => setState((s) => ({ ...s, statuses: { ...s.statuses, [id]: st } })),
    signUp: (account) => setState((s) => ({ ...s, account })),
    signOut: () => setState(() => ({ ...initial })),
    addProfile: (p) => setState((s) => ({ ...s, profiles: [p, ...s.profiles.filter((x) => x.id !== p.id)], activeId: p.id })),
    updateProfile: (p) => setState((s) => ({ ...s, profiles: s.profiles.map((x) => (x.id === p.id ? p : x)) })),
    removeProfile: (id) =>
      setState((s) => ({
        ...s,
        profiles: s.profiles.filter((x) => x.id !== id),
        activeId: s.activeId === id ? DEMO_WORKSPACES[0].id : s.activeId,
      })),
    setPendingScan: (id) => setState((s) => ({ ...s, pendingScanId: id })),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
