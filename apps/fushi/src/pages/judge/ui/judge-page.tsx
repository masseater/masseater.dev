import { Match, Option } from "effect";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { shownOf } from "#/pages/judge/model/pending.ts";
import { useJudging } from "#/pages/judge/model/use-split.ts";
import type { Judging } from "#/pages/judge/model/use-split.ts";
import { LABELS } from "#/shared/config/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";
import { Failure } from "#/shared/ui/index.ts";

import { HabitView } from "./habit-view.tsx";
import { JudgeMessage } from "./judge-message.tsx";

type Shown = Readonly<{ library: Library; style: Style; habit: Option.Option<string> }>;

const judgingView =
  ({ library, style, habit }: Shown) =>
  (judging: Judging): ReactNode =>
    Option.match(shownOf(judging.split)(habit), {
      onNone: () => (
        <JudgeMessage>
          <p className="text-muted-foreground text-sm">{LABELS.noHabits}</p>
        </JudgeMessage>
      ),
      onSome: (candidate) => (
        <HabitView
          key={candidate.key}
          library={library}
          current={style}
          judging={judging}
          candidate={candidate}
        />
      ),
    });

const viewOf = (shown: Shown): ((loaded: Loaded<Judging>) => ReactNode) =>
  Match.type<Loaded<Judging>>().pipe(
    Match.discriminatorsExhaustive("status")({
      loading: (): ReactNode => (
        <JudgeMessage>
          <p className="text-muted-foreground text-sm">{LABELS.finding}</p>
        </JudgeMessage>
      ),
      failed: ({ message }): ReactNode => (
        <JudgeMessage>
          <Failure>{message}</Failure>
        </JudgeMessage>
      ),
      ready: ({ value }): ReactNode => judgingView(shown)(value),
    }),
  );

export const JudgePage = ({
  library,
  current: style,
  habit,
}: Readonly<{ library: Library; current: Style; habit: Option.Option<string> }>): ReactNode =>
  viewOf({ library, style, habit })(useJudging({ library, style }));
