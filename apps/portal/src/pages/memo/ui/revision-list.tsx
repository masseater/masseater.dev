import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi/index.ts";
import { RowList } from "#/shared/ui/index.ts";

import { RevisionRow } from "./revision-row";

const LABEL = "履歴";

export const RevisionList = ({
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
