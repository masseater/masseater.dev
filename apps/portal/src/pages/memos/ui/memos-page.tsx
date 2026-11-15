import type { ReactNode } from "react";

import { MemoList } from "./memo-list";
import { ProjectList } from "./project-list";

const MemosPage = (): ReactNode => (
  <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
    <div className="min-w-0 xl:flex-1">
      <MemoList />
    </div>
    <div className="xl:sticky xl:top-24 xl:w-56 xl:shrink-0">
      <ProjectList />
    </div>
  </div>
);

export { MemosPage };
