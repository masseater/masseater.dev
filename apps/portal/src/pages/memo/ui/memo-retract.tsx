import { Button } from "@masseater.dev/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";
import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type { MemoValue } from "#/entities/watashi";
import { useChangeMemo } from "#/pages/memo/api/use-change-memo";
import { formText } from "#/shared/lib";

import { FailedNote } from "./failed-note";

const TEXT = { reason: "取り消す理由", retract: "取り消す" } as const;

export const MemoRetract = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => {
  const navigate = useNavigate();
  const retract = useChangeMemo();
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      retract.mutate(
        {
          project: memo.project,
          name: memo.name,
          retract: true,
          reason: formText(event)("reason"),
        },
        {
          onSuccess: () => {
            Effect.runFork(
              Effect.promise(() => navigate({ to: "/memos", search: { project: memo.project } })),
            );
          },
        },
      );
    },
    [memo.project, memo.name, navigate, retract],
  );
  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <div className="flex items-center gap-2">
        <input
          aria-label={TEXT.reason}
          className="border-input focus-visible:ring-ring h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2"
          name="reason"
          placeholder={TEXT.reason}
          required
        />
        <Button disabled={retract.isPending} type="submit" variant="destructive">
          {TEXT.retract}
        </Button>
      </div>
      <FailedNote error={retract.error} />
    </form>
  );
};
