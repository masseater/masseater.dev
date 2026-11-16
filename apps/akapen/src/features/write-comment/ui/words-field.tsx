import { useAtom } from "@effect/atom-react";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import { wordsAtom } from "#/features/write-comment/model/draft.ts";

const sends = ({
  key,
  ctrlKey,
  metaKey,
  nativeEvent,
}: KeyboardEvent<HTMLTextAreaElement>): boolean =>
  key === "Enter" && (ctrlKey || metaKey) && !nativeEvent.isComposing;

export const WordsField = (): ReactNode => {
  const [words, setWords] = useAtom(wordsAtom);
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setWords(event.currentTarget.value);
    },
    [setWords],
  );
  const press = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (sends(event)) {
      event.preventDefault();
      const { form } = event.currentTarget;
      if (form !== null) {
        form.requestSubmit();
      }
    }
  }, []);
  return (
    <textarea
      value={words}
      aria-label="感想・直してほしいこと"
      placeholder="感想・直してほしいこと"
      rows={5}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-3"
      onChange={change}
      onKeyDown={press}
    />
  );
};
