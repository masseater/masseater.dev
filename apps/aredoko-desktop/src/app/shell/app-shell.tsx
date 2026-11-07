import type { ReactNode } from "react";

import { useModelRendering } from "#/features/render-models";

import { CurrentPage } from "./current-page.tsx";
import { Header } from "./header.tsx";

const AppShell = (): ReactNode => {
  useModelRendering();
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <CurrentPage />
      </main>
    </div>
  );
};

export { AppShell };
