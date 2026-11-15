import type { ReactNode } from "react";

import { ProjectList } from "#/features/filter-memos";

import { MemoList } from "./memo-list";

export const MemosPage = (): ReactNode => (
  <div className="lg:grid-cols-memos grid items-start gap-5">
    <ProjectList />
    <MemoList />
  </div>
);
