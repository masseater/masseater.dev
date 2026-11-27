import { Array as Arr, Option, pipe } from "effect";

import { judgmentOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";

export type Split = Readonly<{ pending: readonly Candidate[]; judged: readonly Candidate[] }>;

type Judged = Readonly<{ library: Library; style: Style }>;

const isJudged =
  ({ library, style }: Judged) =>
  (candidate: Candidate): boolean =>
    Option.isSome(judgmentOf(library)({ style: style.id, habit: candidate.key }));

export const splitOf =
  (target: Judged) =>
  (list: readonly Candidate[]): Split => ({
    pending: pipe(
      list,
      Arr.filter((candidate) => !isJudged(target)(candidate)),
    ),
    judged: pipe(list, Arr.filter(isJudged(target))),
  });

export const shownOf =
  (split: Split) =>
  (habit: Option.Option<string>): Option.Option<Candidate> =>
    pipe(
      habit,
      Option.flatMap((key) =>
        Arr.findFirst(Arr.appendAll(split.pending, split.judged), (each) => each.key === key),
      ),
      Option.orElse(() => Arr.head(split.pending)),
    );

export const nextOf =
  (split: Split) =>
  (current: string): Option.Option<string> =>
    pipe(
      split.pending,
      Arr.findFirst((each) => each.key !== current),
      Option.map((each) => each.key),
    );
