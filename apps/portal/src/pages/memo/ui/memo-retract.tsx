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
      <div className="flex items-baseline gap-4">
        <input
          aria-label={TEXT.reason}
          className="border-foreground/20 focus-visible:border-foreground min-w-0 flex-1 border-b bg-transparent py-2 text-sm outline-none"
          name="reason"
          placeholder={TEXT.reason}
          required
        />
        <button
          className="stage-link text-destructive/80 hover:text-destructive"
          disabled={retract.isPending}
          type="submit"
        >
          {TEXT.retract}
        </button>
      </div>
      <FailedNote error={retract.error} />
    </form>
  );
};
