import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type { MemoValue } from "#/entities/watashi/index.ts";
import { useChangeMemo } from "#/features/edit-memo/api/use-change-memo.ts";
import { formText } from "#/shared/lib/index.ts";

import { FailedNote } from "./failed-note.tsx";

const TEXT = { description: "説明", content: "本文", save: "保存" } as const;

const FIELD =
  "border-input focus-visible:ring-ring w-full rounded-md border bg-white px-3 py-2 outline-none focus-visible:ring-2";

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
      <Button className="self-end" disabled={save.isPending} type="submit">
        {TEXT.save}
      </Button>
    </form>
  );
};
