import { Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { aimsOf, judgmentOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { Decide } from "#/features/judge-habit/index.ts";
import type { Decision } from "#/features/judge-habit/index.ts";
import { HARMONY } from "#/shared/config/index.ts";

import { JudgedRow } from "./judged-row.tsx";

export const HabitVerdict = ({
  library,
  current: style,
  habit,
  next,
}: Readonly<{
  library: Library;
  current: Style;
  habit: string;
  next: Option.Option<string>;
}>): ReactNode => {
  const decision = useMemo(
    (): Decision => ({
      style: style.id,
      habit,
      aims: aimsOf(library)({ style: style.id, category: HARMONY }),
      next: { page: "judge", style: style.id, habit: next },
    }),
    [library, style.id, habit, next],
  );
  return Option.match(judgmentOf(library)({ style: style.id, habit }), {
    onNone: () => <Decide decision={decision} />,
    onSome: (judgment) => <JudgedRow library={library} judgment={judgment} />,
  });
};
