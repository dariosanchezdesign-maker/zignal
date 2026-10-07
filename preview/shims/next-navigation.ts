import { useMemo } from "react";
import { useRouterContext } from "../router";

export function usePathname() {
  return useRouterContext().path.split("?")[0];
}

export function useSearchParams() {
  const { path } = useRouterContext();
  return useMemo(() => new URLSearchParams(path.split("?")[1] ?? ""), [path]);
}

export function useRouter() {
  const { navigate, back } = useRouterContext();
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, true),
    back,
    prefetch: () => {},
    refresh: () => {},
  };
}
