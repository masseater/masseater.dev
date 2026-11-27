import { Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { aimsOf, judgmentOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";
import { Decide } from "#/features/judge-habit/index.ts";
import type { Decision } from "#/features/judge-habit/index.ts";

import { JudgedRow } from "./judged-row.tsx";

export const HabitVerdict = ({
  library,
  current: style,
  candidate,
  next,
}: Readonly<{
  library: Library;
  current: Style;
  candidate: Candidate;
  next: Option.Option<string>;
}>): ReactNode => {
  const habit = candidate.key;
  const decision = useMemo(
    (): Decision => ({
      style: style.id,
      habit,
      subject: candidate.subject,
      category: candidate.category,
      aims: aimsOf(library)({ style: style.id, category: candidate.category }),
      after: { page: "judge", style: style.id, habit: next },
    }),
    [library, style.id, habit, candidate.subject, candidate.category, next],
  );
  return Option.match(judgmentOf(library)({ style: style.id, habit }), {
    onNone: () => <Decide decision={decision} />,
    onSome: (judgment) => <JudgedRow library={library} judgment={judgment} />,
  });
};
