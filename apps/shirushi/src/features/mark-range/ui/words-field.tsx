import { useAtom } from "@effect/atom-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { wordsAtom } from "#/features/mark-range/model/draft.ts";

export const WordsField = (): ReactNode => {
  const [words, setWords] = useAtom(wordsAtom);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setWords(event.currentTarget.value);
    },
    [setWords],
  );
  return (
    <input
      value={words}
      aria-label="ひとこと"
      placeholder="ひとこと"
      autoComplete="off"
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-3"
      onChange={change}
    />
  );
};
