import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useRestore, useRevisions } from "#/features/manuscript-history/api/revisions.ts";

import { RevisionItem } from "./revision-item.tsx";

const LABEL = "履歴";
const NOTHING_KEPT = "履歴なし";

const RevisionList = ({ id }: Readonly<{ id: string }>): ReactNode => {
  const revisions = useRevisions(id);
  const restore = useRestore(id);
  if (Array.isReadonlyArrayEmpty(revisions)) {
    return <p className="text-muted-foreground pb-3 pl-4 text-sm">{NOTHING_KEPT}</p>;
  }
  return (
    <ol aria-label={LABEL} className="pb-2 pl-4">
      {pipe(
        revisions,
        Array.map((revision) => (
          <RevisionItem key={revision.id} restore={restore} revision={revision} />
        )),
      )}
    </ol>
  );
};

export { RevisionList };
