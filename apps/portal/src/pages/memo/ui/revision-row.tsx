import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi";
import { shownTime } from "#/shared/model";
import { Row } from "#/shared/ui";

import { RestoreButton } from "./restore-button";

const SHOWN = "本文";

const leadOf = (revision: RevisionValue): string =>
  `${shownTime(revision.at)} r${String(revision.rev)} ${revision.op} ${revision.actor}`;

const RevisionRow = ({
  memo,
  revision,
}: Readonly<{ memo: MemoValue; revision: RevisionValue }>): ReactNode => (
  <Row lead={leadOf(revision)}>
    <p className="text-foreground/70 text-sm">{revision.body.description}</p>
    <details>
      <summary className="text-foreground/50 cursor-pointer text-xs">{SHOWN}</summary>
      <pre className="text-foreground/80 mt-2 text-xs leading-relaxed whitespace-pre-wrap">
        {revision.body.content}
      </pre>
    </details>
    <RestoreButton memo={memo} rev={revision.rev} />
  </Row>
);

export { RevisionRow };
