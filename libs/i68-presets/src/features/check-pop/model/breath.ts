import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, pipe } from "effect";

import { numberOption } from "#/shared/lib/options.ts";
import { clockOf } from "#/shared/lib/time.ts";
import { MELODIC, hasRole, reporterOf, topLineOf, tracksOf } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

const DEFAULT_SECONDS = 8;
const DEFAULT_REST = 0.15;
const DIGITS = 1;
const LAST = 1;
const maxSeconds = numberOption({ key: "seconds", fallback: DEFAULT_SECONDS });
const minRest = numberOption({ key: "rest", fallback: DEFAULT_REST });

type Clock = (tick: number) => number;

type Phrase = Arr.NonEmptyReadonlyArray<Sounding>;

const phrasesOf =
  (clock: Clock, rest: number) =>
  (line: readonly Sounding[]): readonly Phrase[] =>
    Arr.reduce(line, Arr.empty<Phrase>(), (phrases, note): readonly Phrase[] =>
      pipe(
        Arr.last(phrases),
        Option.filter((phrase) => clock(note.start) - clock(Arr.lastNonEmpty(phrase).end) < rest),
        Option.match({
          onNone: () => Arr.append(phrases, Arr.of(note)),
          onSome: (phrase) => Arr.append(Arr.dropRight(phrases, LAST), Arr.append(phrase, note)),
        }),
      ),
    );

const endOf = (phrase: Phrase): number =>
  pipe(
    phrase,
    Arr.map((sounding) => sounding.end),
    (ends) => Math.max(...ends),
  );

const checkPhrase =
  (report: Reporter, clock: Clock, max: number) =>
  (phrase: Phrase): void => {
    const first = Arr.headNonEmpty(phrase);
    const seconds = clock(endOf(phrase)) - clock(first.start);
    if (seconds > max) {
      report(`${String(first.line)}:${String(first.start)}`, {
        line: first.line,
        column: first.column,
        message: `${first.track} sings for ${seconds.toFixed(DIGITS)} seconds without a rest`,
        detail: "Put a short rest in the phrase",
      });
    }
  };

export const breath: Rule = defineRule({
  meta: { description: "A sung line leaves room to breathe" },
  check: (context) => {
    const clock = clockOf(context.song);
    const check = checkPhrase(reporterOf(context), clock, maxSeconds(context.options));
    const split = phrasesOf(clock, minRest(context.options));
    const melodic = pipe(context.soundings, Arr.filter(hasRole(MELODIC)));
    for (const track of tracksOf(melodic)) {
      for (const phrase of split(topLineOf(track))) {
        check(phrase);
      }
    }
  },
});
