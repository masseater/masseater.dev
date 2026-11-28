import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { fitBeats } from "./fit-beats.ts";
import type { QueryType } from "./fit-beats.ts";

const LEAD = 0.05;
const SPEED = 1.5;
const DIGITS = 6;

const query: QueryType = {
  accent_phrases: [
    {
      moras: [
        { consonant_length: 0.06, vowel_length: 0.1 },
        { vowel_length: 0.12 },
        { consonant_length: 0.05, vowel_length: 0.09 },
      ],
      pause_mora: { vowel_length: 0.2 },
    },
    {
      moras: [
        { consonant_length: 0.07, vowel_length: 0.11 },
        { consonant_length: 0.04, vowel_length: 0.1 },
      ],
    },
  ],
};

const NONE = 0;
const COUNTS = { first: 2, second: 2, third: 1 } as const;
const BEATS = { first: 0, second: 0.6, third: 1 } as const;
const LINE = { counts: Rec.values(COUNTS), beats: Rec.values(BEATS) };
const PART_ONSETS = { second: 5, third: 10 } as const;

const vowelOnsets = (fitted: QueryType): readonly number[] =>
  pipe(
    fitted.accent_phrases,
    Arr.flatMap((phrase) => [
      ...pipe(
        phrase.moras,
        Arr.flatMap((each) => [each.consonant_length ?? NONE, each.vowel_length]),
      ),
      phrase.pause_mora?.vowel_length ?? NONE,
    ]),
    Arr.mapAccum(LEAD, (time, length) => [time + length, time]),
    ([, starts]) => starts,
  );

describe("fitBeats", () => {
  it("starts the vowel of each part's first mora on its beat", () => {
    const fitted = fitBeats({ query, ...LINE, speed: SPEED, lead: LEAD });
    const onsets = vowelOnsets(fitted.query);
    const landed = Option.all([
      Arr.get(onsets, PART_ONSETS.second),
      Arr.get(onsets, PART_ONSETS.third),
    ]).pipe(Option.getOrThrow);
    const [second, third] = landed;
    expect(second).toBeCloseTo(BEATS.second, DIGITS);
    expect(third).toBeCloseTo(BEATS.third, DIGITS);
  });

  it("reads the last part at the line's own speed", () => {
    const fitted = fitBeats({ query, ...LINE, speed: SPEED, lead: LEAD });
    expect(Arr.last(fitted.speeds)).toStrictEqual(Option.some(SPEED));
  });
});
