import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SEARCHABLE_KINDS } from "#/pages/home/config";

import { KindChip } from "./kind-chip.tsx";

const KindChips = (): ReactNode => (
  <div className="flex flex-wrap gap-1.5">
    {pipe(
      SEARCHABLE_KINDS,
      Array.map((kind) => <KindChip key={kind} kind={kind} />),
    )}
  </div>
);

export { KindChips };
