import type { ReactNode } from "react";

import { MetaState } from "./meta-state";
import { PageHeader } from "./page-header";

const RankingPage = (): ReactNode => (
  <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <PageHeader />
    <MetaState />
  </main>
);

export { RankingPage };
