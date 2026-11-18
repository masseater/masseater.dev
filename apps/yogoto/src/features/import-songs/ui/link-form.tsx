import { useAtom, useAtomSet } from "@effect/atom-react";
import { String as Str } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { importAtom, linesOf, linkTextAtom } from "#/features/import-songs/model/import.ts";
import { LABELS } from "#/shared/config/index.ts";

export const LinkForm = (): ReactNode => {
  const [text, setText] = useAtom(linkTextAtom);
  const send = useAtomSet(importAtom);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.currentTarget.value);
    },
    [setText],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      send(linesOf(text));
      setText("");
    },
    [send, setText, text],
  );
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={text}
        onChange={handleChange}
        aria-label={LABELS.link}
        placeholder={LABELS.linkHint}
        className="bg-background min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={Str.isEmpty(Str.trim(text))}
        className="shrink-0 rounded-md border px-2 py-1.5 text-sm whitespace-nowrap disabled:opacity-50"
      >
        {LABELS.importLinks}
      </button>
    </form>
  );
};
