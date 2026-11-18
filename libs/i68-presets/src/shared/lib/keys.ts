import type { Bar, Song } from "@r_masseater/fumx-parser";
import { keyIn } from "@r_masseater/fumx-parser/analysis";
import type { BarRange, KeySpan } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Option, String as Str, pipe } from "effect";

const PHRASE_BARS = 4;
const FIRST = 1;

interface Labeled {
  readonly bar: Bar;
  readonly label: string;
}

const phraseOf = (bar: Bar): string => `#${String(Math.floor((bar.index - FIRST) / PHRASE_BARS))}`;

const labeled = (bars: readonly Bar[]): readonly Labeled[] =>
  Arr.reduce(bars, Arr.empty<Labeled>(), (done, bar) => {
    const carried = pipe(
      Arr.last(done),
      Option.filter((previous) => !Str.startsWith("#")(previous.label)),
      Option.map((previous) => previous.label),
    );
    const label = pipe(
      bar.section,
      Option.orElse(() => carried),
      Option.getOrElse(() => phraseOf(bar)),
    );
    return Arr.append(done, { bar, label });
  });

const rangesOf = (song: Song): readonly BarRange[] =>
  pipe(
    Arr.match(labeled(song.bars), {
      onEmpty: (): readonly Arr.NonEmptyReadonlyArray<Labeled>[] => [],
      onNonEmpty: (bars) => Arr.groupWith(bars, (left, right) => left.label === right.label),
    }),
    Arr.map(Arr.map(({ bar }) => bar)),
    Arr.map((bars) => ({
      fromBar: Arr.headNonEmpty(bars).index,
      toBar: Arr.lastNonEmpty(bars).index,
    })),
  );

export const keysOf = (song: Song): readonly KeySpan[] =>
  pipe(rangesOf(song), Arr.map(keyIn(song)), Arr.getSomes);

export const keyAt =
  (keys: readonly KeySpan[]) =>
  (bar: number): Option.Option<KeySpan> =>
    pipe(
      keys,
      Arr.findFirst((span) => span.fromBar <= bar && bar <= span.toBar),
    );
