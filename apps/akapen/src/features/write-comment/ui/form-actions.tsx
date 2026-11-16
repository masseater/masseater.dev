import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import { anchorAtom, rangeAtom } from "@masseater.dev/media-notes-ui";
import { Button } from "@masseater.dev/ui/button";
import { Option, String as Str } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { wordsAtom } from "#/features/write-comment/model/draft.ts";

const CLEAR = "消す";
const SAVE = "保存";
const SAVE_KEYS = "Ctrl+Enter";

export const FormActions = ({ saving }: Readonly<{ saving: boolean }>): ReactNode => {
  const [range, setRange] = useAtom(rangeAtom);
  const setAnchor = useAtomSet(anchorAtom);
  const words = useAtomValue(wordsAtom);
  const clear = useCallback(() => {
    setRange(Option.none());
    setAnchor(Option.none());
  }, [setRange, setAnchor]);
  const spanned = Option.exists(range, ({ from, to }) => to > from);
  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={Option.isNone(range)}
        onClick={clear}
      >
        {CLEAR}
      </Button>
      <Button
        type="submit"
        size="sm"
        title={`${SAVE} (${SAVE_KEYS})`}
        disabled={!spanned || Str.isEmpty(Str.trim(words)) || saving}
      >
        {SAVE}
      </Button>
    </div>
  );
};
