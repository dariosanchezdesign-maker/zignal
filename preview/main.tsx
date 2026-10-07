import { createRoot } from "react-dom/client";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import Landing from "@/app/page";
import SignUp from "@/app/signup/page";
import Onboarding from "@/app/onboarding/page";
import ScanPage from "@/app/scan/page";
import Overview from "@/app/app/page";
import Visibility from "@/app/app/visibility/page";
import Queries from "@/app/app/queries/page";
import Competitors from "@/app/app/competitors/page";
import Opportunities from "@/app/app/opportunities/page";
import Reports from "@/app/app/reports/page";
import Settings from "@/app/app/settings/page";
import { RouterProvider, useRouterContext } from "./router";

const PUBLIC: Record<string, React.ComponentType> = {
  "/": Landing,
  "/signup": SignUp,
  "/onboarding": Onboarding,
  "/scan": ScanPage,
};

const APP: Record<string, React.ComponentType> = {
  "/app": Overview,
  "/app/visibility": Visibility,
  "/app/queries": Queries,
  "/app/competitors": Competitors,
  "/app/opportunities": Opportunities,
  "/app/reports": Reports,
  "/app/settings": Settings,
};

function Routes() {
  const path = useRouterContext().path.split("?")[0];
  const Page = PUBLIC[path];
  if (Page) return <Page />;
  const AppPage = APP[path] ?? Overview;
  return (
    <AppShell>
      <AppPage />
    </AppShell>
  );
}

createRoot(document.getElementById("zignal-root")!).render(
  <RouterProvider>
    <StoreProvider>
      <Routes />
    </StoreProvider>
  </RouterProvider>,
);
