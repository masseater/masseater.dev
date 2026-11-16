import { useAtomValue } from "@effect/atom-react";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { placedAtom } from "#/entities/manuscript/index.ts";
import { RemarkNote } from "#/features/respond-to-remark/index.ts";

export const MarginNotes = (): ReactNode => (
  <div className="relative w-75 shrink-0">
    {pipe(
      useAtomValue(placedAtom),
      Array.map((placed) => <RemarkNote key={placed.marked.key} placed={placed} />),
    )}
  </div>
);
