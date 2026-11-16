import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { ManuscriptRow } from "#/entities/manuscript/index.ts";
import { ExportButton } from "#/features/export-manuscript/index.ts";
import {
  HistoryButton,
  RevisionList,
  useHistoryShown,
} from "#/features/manuscript-history/index.ts";

export const ManuscriptEntry = ({
  manuscript,
}: Readonly<{ manuscript: typeof Manuscript.Type }>): ReactNode => {
  const [history, toggleHistory] = useHistoryShown(manuscript.id);
  return (
    <li className="border-b">
      <ManuscriptRow manuscript={manuscript}>
        <HistoryButton open={history} toggle={toggleHistory} />
        <ExportButton id={manuscript.id} />
      </ManuscriptRow>
      {history && <RevisionList id={manuscript.id} />}
    </li>
  );
};
