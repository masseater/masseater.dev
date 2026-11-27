import { Array as Arr, Option, String as Str, pipe } from "effect";

export type Segment = Readonly<{ text: string; code: boolean; emphasis: boolean }>;

const MARKUP = /\*\*(?<emphasis>[^*]+)\*\*|`(?<code>[^`]+)`|(?<plain>[^*`]+|[*`])/gu;

const segmentOf = (groups: Readonly<Record<string, string | undefined>>): Segment =>
  Option.match(Option.fromNullishOr(groups["emphasis"]), {
    onSome: (text) => ({ text, code: false, emphasis: true }),
    onNone: () =>
      Option.match(Option.fromNullishOr(groups["code"]), {
        onSome: (text) => ({ text, code: true, emphasis: false }),
        onNone: () => ({ text: groups["plain"] ?? "", code: false, emphasis: false }),
      }),
  });

export const segmentsOf = (markup: string): readonly Segment[] =>
  pipe(
    markup,
    Str.matchAll(MARKUP),
    Arr.fromIterable,
    Arr.map((match) => segmentOf(match.groups ?? {})),
  );

export const plainOf = (segments: readonly Segment[]): string =>
  pipe(
    segments,
    Arr.map(({ text }) => text),
    Arr.join(""),
  );
