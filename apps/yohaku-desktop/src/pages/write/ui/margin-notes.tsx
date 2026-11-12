import { useAtomValue } from "@effect/atom-react";
import type { ReactNode } from "react";

import { placedAtom } from "#/pages/write/model/writing-atoms.ts";

import { RemarkNote } from "./remark-note.tsx";

const MarginNotes = (): ReactNode => {
  const placed = useAtomValue(placedAtom);
  return (
    <div className="relative">
      {placed.map((item) => (
        <RemarkNote key={item.marked.key} placed={item} />
      ))}
    </div>
  );
};

export { MarginNotes };
