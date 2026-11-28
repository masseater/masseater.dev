import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi/index.ts";
import { RetractedNote } from "#/entities/watashi/index.ts";
import { shownTime } from "#/shared/model/index.ts";
import { Row } from "#/shared/ui/index.ts";

export const MemoRow = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => {
  const params = useMemo(() => ({ project: memo.project, name: memo.name }), [memo]);
  return (
    <Row lead={shownTime(memo.updatedAt)}>
      <Link
        className="text-link font-bold break-words underline underline-offset-3"
        params={params}
        to="/memos/$project/$name"
      >
        {memo.name}
      </Link>
      <p className="text-muted-foreground text-sm">{memo.description}</p>
      <p className="text-muted-foreground text-xs">{memo.project}</p>
      <RetractedNote memo={memo} />
    </Row>
  );
};
