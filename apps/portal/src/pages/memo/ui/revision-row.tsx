import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi";
import { RestoreButton } from "#/features/edit-memo";
import { shownTime } from "#/shared/model";
import { Row } from "#/shared/ui";

const SHOWN = "本文";

const leadOf = (revision: RevisionValue): string =>
  `${shownTime(revision.at)} r${String(revision.rev)} ${revision.op} ${revision.actor}`;

export const RevisionRow = ({
  memo,
  revision,
}: Readonly<{ memo: MemoValue; revision: RevisionValue }>): ReactNode => (
  <Row lead={leadOf(revision)}>
    <p className="text-muted-foreground text-sm">{revision.body.description}</p>
    <details>
      <summary className="text-muted-foreground cursor-pointer text-xs">{SHOWN}</summary>
      <pre className="text-foreground mt-2 text-xs leading-relaxed whitespace-pre-wrap">
        {revision.body.content}
      </pre>
    </details>
    <RestoreButton memo={memo} rev={revision.rev} />
  </Row>
);
