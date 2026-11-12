import type { ReactNode } from "react";

import { SourceList } from "./source-list.tsx";

const TITLE = "取り込んだ資料";

const SourceListPane = (): ReactNode => (
  <main className="min-w-0 grow overflow-y-auto px-14 py-8">
    <h2 className="mb-2 text-sm font-bold">{TITLE}</h2>
    <SourceList label={TITLE} />
  </main>
);

export { SourceListPane };
