import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type { MemoValue } from "#/entities/watashi";
import { useChangeMemo } from "#/features/edit-memo/api/use-change-memo";
import { formText } from "#/shared/lib";

import { FailedNote } from "./failed-note";

const TEXT = { description: "説明", content: "本文", save: "保存" } as const;

const FIELD =
  "border-foreground/20 focus-visible:border-foreground w-full border-b bg-transparent py-2 outline-none";

export const MemoEditor = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => {
  const save = useChangeMemo();
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = formText(event);
      save.mutate({
        project: memo.project,
        name: memo.name,
        description: text("description"),
        content: text("content"),
      });
    },
    [memo.project, memo.name, save],
  );
  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <input
        aria-label={TEXT.description}
        className={`${FIELD} text-sm`}
        defaultValue={memo.description}
        name="description"
        required
      />
      <textarea
        aria-label={TEXT.content}
        className={`${FIELD} field-sizing-content min-h-60 font-mono text-sm leading-relaxed`}
        defaultValue={memo.content}
        name="content"
        required
      />
      <FailedNote error={save.error} />
      <button className="stage-link self-end" disabled={save.isPending} type="submit">
        {TEXT.save}
      </button>
    </form>
  );
};
