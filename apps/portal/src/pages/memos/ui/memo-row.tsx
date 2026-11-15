import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi";
import { RetractedNote } from "#/entities/watashi";
import { shownTime } from "#/shared/model";
import { Row } from "#/shared/ui";

const MemoRow = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => {
  const params = useMemo(() => ({ project: memo.project, name: memo.name }), [memo]);
  return (
    <Row lead={shownTime(memo.updatedAt)}>
      <Link
        className="font-display hover:text-foreground/70 text-lg font-light break-words transition-colors"
        params={params}
        to="/memos/$project/$name"
      >
        {memo.name}
      </Link>
      <p className="text-foreground/70 text-sm">{memo.description}</p>
      <p className="font-display text-foreground/40 text-xs tracking-widest">{memo.project}</p>
      <RetractedNote memo={memo} />
    </Row>
  );
};

export { MemoRow };
