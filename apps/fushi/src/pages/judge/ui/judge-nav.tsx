import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { shownOf } from "#/pages/judge/model/pending.ts";
import { useJudging } from "#/pages/judge/model/use-split.ts";
import { LABELS } from "#/shared/config/index.ts";
import { readyValue } from "#/shared/lib/index.ts";
import { NavHeading } from "#/shared/ui/index.ts";

import { HabitLinks } from "./habit-links.tsx";

export const JudgeNav = ({
  library,
  current: style,
  habit,
}: Readonly<{ library: Library; current: Style; habit: Option.Option<string> }>): ReactNode => {
  const judging = readyValue(useJudging({ library, style }));
  if (Option.isNone(judging)) {
    return [];
  }
  const { split } = judging.value;
  const current = Option.map(shownOf(split)(habit), (shown) => shown.key);
  return (
    <>
      <NavHeading>
        {LABELS.pending}
        {LABELS.space}
        {split.pending.length}
      </NavHeading>
      <HabitLinks current={style.id} candidates={split.pending} selected={current} />
      {Arr.isReadonlyArrayNonEmpty(split.judged) && <NavHeading>{LABELS.judged}</NavHeading>}
      <HabitLinks current={style.id} candidates={split.judged} selected={current} />
    </>
  );
};
