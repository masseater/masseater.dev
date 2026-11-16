import { useAtom, useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { anchorAtom, rangeAtom } from "#/features/mark-range/model/draft";

const CLEAR = "消す";
const SAVE = "しるしを保存";

export const FormActions = ({ saving }: Readonly<{ saving: boolean }>): ReactNode => {
  const [range, setRange] = useAtom(rangeAtom);
  const setAnchor = useAtomSet(anchorAtom);
  const clear = useCallback(() => {
    setRange(Option.none());
    setAnchor(Option.none());
  }, [setRange, setAnchor]);
  const empty = Option.isNone(range);
  const spanned = Option.exists(range, ({ from, to }) => to > from);
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={empty} onClick={clear}>
        {CLEAR}
      </Button>
      <Button type="submit" size="sm" disabled={!spanned || saving}>
        {SAVE}
      </Button>
    </div>
  );
};
