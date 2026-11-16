import { useMemo } from "react";

import { PairList } from "#/features/choose-pair/index.ts";
import { StatementList } from "#/features/judge-statement/index.ts";
import { useWaiting } from "#/pages/marking/model/use-waiting.ts";

import type { Tab } from "./taste-tabs.tsx";

export const useTasteTabs = (): readonly [Tab, Tab] => {
  const { pairs, statements } = useWaiting();
  return useMemo(
    (): readonly [Tab, Tab] => [
      { id: "pairs", label: "二択", waiting: pairs, panel: <PairList /> },
      { id: "statements", label: "AI の見立て", waiting: statements, panel: <StatementList /> },
    ],
    [pairs, statements],
  );
};
