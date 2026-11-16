import { Array as Arr, Option, String as Str, pipe } from "effect";

import { ASPECT_LABELS, VERB_LABELS } from "#protocol";
import type { Mark, Song } from "#protocol";
import { clock, linkAt } from "#source";

const line = (label: string, value: string): readonly string[] =>
  pipe(
    Option.liftPredicate(value, Str.isNonEmpty),
    Option.map((text) => `${label}  ${text}`),
    Option.toArray,
  );

const byline = ({ title, artist }: Song): string =>
  pipe(
    Option.liftPredicate(artist, Str.isNonEmpty),
    Option.match({ onNone: () => title, onSome: (name) => `${title} / ${name}` }),
  );

const aspectsOf = (mark: Mark): string =>
  pipe(
    mark.aspects,
    Arr.map((aspect) => ASPECT_LABELS[aspect]),
    Arr.join("  "),
  );

export const briefOf = (mark: Mark): string =>
  pipe(
    [
      [`# ${VERB_LABELS[mark.verb]}  ${byline(mark.song)}  ${clock(mark.from)}–${clock(mark.to)}`],
      line("リンク", linkAt({ source: mark.song.source, seconds: mark.from })),
      line("本人", mark.words),
      line("どこが", aspectsOf(mark)),
    ],
    Arr.flatten,
    Arr.join("\n"),
  );
