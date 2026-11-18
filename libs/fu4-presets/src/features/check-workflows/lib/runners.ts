import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import runners from "#/shared/data/runners.json" with { type: "json" };

interface Hosted {
  readonly label: string;
  readonly os: string;
  readonly image: string;
}

export type Compat = readonly string[];

export const INVALID: Compat = [];

const HOSTED: readonly Hosted[] = runners.hosted;
const SELF_OS: readonly string[] = runners.selfHosted.os;

export const SELF_OTHER: readonly string[] = runners.selfHosted.other;

export const KNOWN_LABELS: readonly string[] = [
  ...pipe(
    HOSTED,
    Arr.map((hosted) => hosted.label),
  ),
  ...SELF_OTHER,
  ...SELF_OS,
];

const hostedCompats: Readonly<Record<string, Compat>> = Rec.fromEntries(
  pipe(
    HOSTED,
    Arr.map((hosted) => [Str.toLowerCase(hosted.label), [hosted.image]] as const),
  ),
);

const osCompats: Readonly<Record<string, Compat>> = Rec.fromEntries(
  pipe(
    SELF_OS,
    Arr.map(
      (os) =>
        [
          os,
          pipe(
            HOSTED,
            Arr.filter((hosted) => hosted.os === os),
            Arr.map((hosted) => hosted.image),
            Arr.dedupe,
          ),
        ] as const,
    ),
  ),
);

export const compatOf = (label: string): Option.Option<Compat> =>
  Option.orElse(Rec.get(hostedCompats, Str.toLowerCase(label)), () =>
    Rec.get(osCompats, Str.toLowerCase(label)),
  );

export const overlaps =
  (left: Compat) =>
  (right: Compat): boolean =>
    pipe(
      left,
      Arr.some((image) => Arr.contains(right, image)),
    );
