"use client";

import { createContext, useCallback, useContext, useState } from "react";

// In-memory router used by the single-file preview build, standing in for
// Next.js routing (the preview runs inside a frame without real URLs).

interface RouterValue {
  path: string; // may include ?query
  navigate: (to: string, replace?: boolean) => void;
  back: () => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>(["/"]);
  const navigate = useCallback((to: string, replace = false) => {
    setStack((s) => (replace ? [...s.slice(0, -1), to] : [...s, to]));
    if (!to.includes("tab=")) window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  return <RouterContext.Provider value={{ path: stack[stack.length - 1], navigate, back }}>{children}</RouterContext.Provider>;
}

export function useRouterContext() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("RouterProvider missing");
  return ctx;
}
