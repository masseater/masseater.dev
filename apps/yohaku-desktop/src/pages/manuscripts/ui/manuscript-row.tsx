import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { useHistoryShown } from "#/pages/manuscripts/model/history.ts";

import { ManuscriptLine } from "./manuscript-line.tsx";
import { RevisionList } from "./revision-list.tsx";

const ManuscriptRow = ({
  manuscript,
}: Readonly<{ manuscript: typeof Manuscript.Type }>): ReactNode => {
  const [history, toggleHistory] = useHistoryShown(manuscript.id);
  return (
    <li className="border-b">
      <ManuscriptLine history={history} manuscript={manuscript} toggleHistory={toggleHistory} />
      {history && <RevisionList id={manuscript.id} />}
    </li>
  );
};

export { ManuscriptRow };
