import { Option } from "effect";
import type { ReactNode } from "react";

import { useSelectedResult } from "#/pages/home/model";

import { ResultSummary } from "./result-summary.tsx";

const ResultDetail = (): ReactNode => {
  const selected = useSelectedResult();
  if (Option.isNone(selected)) {
    return false;
  }
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
      <ResultSummary result={selected.value} />
    </aside>
  );
};

export { ResultDetail };
