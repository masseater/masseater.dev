import type { ReactNode } from "react";

import { MetaState } from "./meta-state.tsx";
import { PageHeader } from "./page-header.tsx";

export const RankingPage = (): ReactNode => (
  <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <PageHeader />
    <MetaState />
  </main>
);
