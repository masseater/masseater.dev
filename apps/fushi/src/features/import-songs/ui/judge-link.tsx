import { useAtomValue } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import { outcomeAtom } from "#/features/import-songs/model/import.ts";
import { LABELS } from "#/shared/config/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

export const JudgeLink = ({ current: style }: Readonly<{ current: string }>): ReactNode => {
  const outcome = useAtomValue(outcomeAtom(style));
  return (
    outcome.status === "done" &&
    Arr.isReadonlyArrayNonEmpty(outcome.added) && (
      <Button asChild className="justify-self-start">
        <a href={hrefOf({ page: "judge", style, habit: Option.none() })}>{LABELS.judgeHabits}</a>
      </Button>
    )
  );
};
