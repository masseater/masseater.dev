import { useCallback } from "react";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi";
import { useChangeMemo } from "#/features/edit-memo/api/use-change-memo";

const RESTORE = "この版に戻す";

export const RestoreButton = ({
  memo,
  rev,
}: Readonly<{ memo: MemoValue; rev: number }>): ReactNode => {
  const restore = useChangeMemo();
  const click = useCallback(() => {
    restore.mutate({ project: memo.project, name: memo.name, restoreTo: rev });
  }, [memo.project, memo.name, rev, restore]);
  return (
    <button
      className="stage-link self-start text-xs"
      disabled={restore.isPending}
      onClick={click}
      type="button"
    >
      {RESTORE}
    </button>
  );
};
