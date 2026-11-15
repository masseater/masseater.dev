import type { ReactNode } from "react";

import { MemoList } from "./memo-list";
import { ProjectList } from "./project-list";

export const MemosPage = (): ReactNode => (
  <div className="lg:grid-cols-memos grid items-start gap-5">
    <ProjectList />
    <MemoList />
  </div>
);
