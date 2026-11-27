import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import type { Judgment, Song } from "#/entities/library/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import { VerdictChip } from "#/shared/ui/index.ts";

import { RuleMeta } from "./rule-meta.tsx";

export const RuleItem = ({
  judgment,
  candidates,
  songs,
}: Readonly<{
  judgment: Judgment;
  candidates: readonly Candidate[];
  songs: readonly Song[];
}>): ReactNode => {
  const candidate = Arr.findFirst(candidates, (each) => each.key === judgment.habit);
  return (
    <article className="grid gap-2 border-t pt-3">
      <h3 className="flex items-center gap-2 font-semibold">
        <VerdictChip verdict={judgment.verdict} />
        <a
          className="underline-offset-2 hover:underline"
          href={hrefOf({
            page: "judge",
            style: judgment.style,
            habit: Option.some(judgment.habit),
          })}
        >
          {judgment.habit}
        </a>
      </h3>
      {Option.isSome(candidate) && <RuleMeta candidate={candidate.value} songs={songs} />}
    </article>
  );
};
