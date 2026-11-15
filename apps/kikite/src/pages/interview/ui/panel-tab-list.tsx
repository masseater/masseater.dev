import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/entities/interview";

import { PanelTab } from "./panel-tab.tsx";
import { PANELS } from "./panels.ts";
import type { PanelLabel } from "./panels.ts";

const NONE = 0;

const countOf = (panel: PanelLabel, open: number): number => {
  if (panel.id === "open") {
    return open;
  }
  return NONE;
};

export const PanelTabList = (): ReactNode => {
  const open = pipe(
    useSummary(),
    Option.match({ onNone: () => NONE, onSome: (summary) => summary.open.length }),
  );
  return (
    <div role="tablist" className="flex border-b">
      {pipe(
        PANELS,
        Arr.map((panel) => <PanelTab key={panel.id} panel={panel} count={countOf(panel, open)} />),
      )}
    </div>
  );
};
