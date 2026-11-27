import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { judgmentsIn } from "#/entities/library/index.ts";
import type { Aim, Library, Song } from "#/entities/library/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";
import { Subtitle } from "#/shared/ui/index.ts";

import { RuleItem } from "./rule-item.tsx";

export const AimSection = ({
  library,
  aim,
  candidates,
  songs,
}: Readonly<{
  library: Library;
  aim: Aim;
  candidates: readonly Candidate[];
  songs: readonly Song[];
}>): ReactNode => (
  <section className="grid gap-3">
    <Subtitle>{aim.name}</Subtitle>
    {pipe(
      judgmentsIn(library)(aim.id),
      Arr.map((judgment) => (
        <RuleItem key={judgment.habit} judgment={judgment} candidates={candidates} songs={songs} />
      )),
    )}
  </section>
);
