import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi";
import { RowList } from "#/shared/ui";

import { RevisionRow } from "./revision-row";

const LABEL = "履歴";

const RevisionList = ({
  memo,
  revisions,
}: Readonly<{ memo: MemoValue; revisions: readonly RevisionValue[] }>): ReactNode => (
  <RowList label={LABEL}>
    {pipe(
      revisions,
      Arr.map((revision) => <RevisionRow key={revision.rev} memo={memo} revision={revision} />),
    )}
  </RowList>
);

export { RevisionList };
