import { useAtomValue } from "@effect/atom-react";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { placedAtom } from "#/entities/manuscript";
import { RemarkNote } from "#/features/respond-to-remark";

const MarginNotes = (): ReactNode => (
  <div className="relative w-75 shrink-0">
    {pipe(
      useAtomValue(placedAtom),
      Array.map((placed) => <RemarkNote key={placed.marked.key} placed={placed} />),
    )}
  </div>
);

export { MarginNotes };
