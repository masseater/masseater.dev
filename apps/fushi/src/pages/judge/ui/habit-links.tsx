import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Candidate } from "#/features/find-candidates/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import { NavLink } from "#/shared/ui/index.ts";

export const HabitLinks = ({
  current: style,
  candidates,
  selected,
}: Readonly<{
  current: string;
  candidates: readonly Candidate[];
  selected: Option.Option<string>;
}>): ReactNode =>
  pipe(
    candidates,
    Arr.map((candidate) => (
      <NavLink
        key={candidate.key}
        href={hrefOf({ page: "judge", style, habit: Option.some(candidate.key) })}
        active={Option.contains(selected, candidate.key)}
      >
        {candidate.key}
      </NavLink>
    )),
  );
