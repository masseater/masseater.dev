import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import type { KeySpan, Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { isCommonChord } from "#/shared/lib/chords.ts";
import { keyAt, keysOf } from "#/shared/lib/keys.ts";
import { pitchClassOf } from "#/shared/lib/pitch.ts";
import { hasRole, isPitched, reporterOf, soundingAt, tracksOf } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

const EIGHTHS_PER_WHOLE = 8;
const ORNAMENT = TICKS_PER_WHOLE / EIGHTHS_PER_WHOLE;
const HALF_STEP = 1;
const WHOLE_STEP = 2;
const MAJOR_STEPS = { tonic: 0, second: 2, third: 4, fourth: 5, fifth: 7, sixth: 9, seventh: 11 };
const MINOR_STEPS = {
  tonic: 0,
  second: 2,
  flatThird: 3,
  fourth: 5,
  fifth: 7,
  flatSixth: 8,
  raisedSixth: 9,
  flatSeventh: 10,
  leadingTone: 11,
};
const MAJOR = Rec.values(MAJOR_STEPS);
const MINOR = Rec.values(MINOR_STEPS);
const stepsOf = (key: KeySpan): readonly number[] => {
  if (key.mode === "major") {
    return MAJOR;
  }
  return MINOR;
};

const inScale =
  (key: KeySpan) =>
  (midi: number): boolean =>
    Arr.contains(stepsOf(key), pitchClassOf(midi - key.pitchClass));

type Fits = (sounding: Sounding) => boolean;

const inChordOf = (soundings: readonly Sounding[]): Fits => {
  const harmony = pipe(soundings, Arr.filter(hasRole(["bass", "harmony"])));
  return (sounding) => {
    const under = soundingAt(harmony)(sounding.start);
    const shared = pipe(
      under,
      Arr.some(
        (other) =>
          other.track !== sounding.track &&
          pitchClassOf(other.midi) === pitchClassOf(sounding.midi),
      ),
    );
    const voicesChord =
      hasRole(["bass", "harmony"])(sounding) &&
      isCommonChord(
        pipe(
          under,
          Arr.map((other) => other.pitchClass),
        ),
      );
    return shared || voicesChord;
  };
};

const isStep = (from: Sounding, to: Sounding): boolean => {
  const distance = Math.abs(to.midi - from.midi);
  return distance >= HALF_STEP && distance <= WHOLE_STEP;
};

const endsAt =
  (tick: number) =>
  (other: Sounding): boolean =>
    other.end === tick;

const startsAt =
  (tick: number) =>
  (other: Sounding): boolean =>
    other.start === tick;

const neighboursOf =
  (track: readonly Sounding[]) =>
  (sounding: Sounding): Option.Option<readonly [Sounding, Sounding]> => {
    const before = pipe(track, Arr.findLast(endsAt(sounding.start)));
    const after = pipe(track, Arr.findFirst(startsAt(sounding.end)));
    return Option.all([before, after]);
  };

const isOrnament =
  (fits: Fits, track: readonly Sounding[]) =>
  (sounding: Sounding): boolean =>
    sounding.end - sounding.start <= ORNAMENT &&
    pipe(
      neighboursOf(track)(sounding),
      Option.exists(
        ([before, after]) =>
          isStep(before, sounding) && isStep(sounding, after) && fits(before) && fits(after),
      ),
    );

const fitsOf =
  (keys: readonly KeySpan[], inChord: Fits): Fits =>
  (sounding) =>
    inChord(sounding) ||
    pipe(
      keyAt(keys)(sounding.bar),
      Option.match({ onNone: () => true, onSome: (key) => inScale(key)(sounding.midi) }),
    );

interface NoteCheck {
  readonly report: Reporter;
  readonly keys: readonly KeySpan[];
  readonly fits: Fits;
  readonly tracks: readonly (readonly Sounding[])[];
}

const trackOf =
  (tracks: readonly (readonly Sounding[])[]) =>
  (sounding: Sounding): readonly Sounding[] =>
    pipe(
      tracks,
      Arr.findFirst((candidate) =>
        pipe(
          candidate,
          Arr.some((other) => other.track === sounding.track),
        ),
      ),
      Option.getOrElse((): readonly Sounding[] => []),
    );

const checkNote =
  ({ report, keys, fits, tracks }: NoteCheck) =>
  (sounding: Sounding): void => {
    const track = trackOf(tracks)(sounding);
    for (const key of Option.toArray(keyAt(keys)(sounding.bar))) {
      if (!fits(sounding) && !isOrnament(fits, track)(sounding)) {
        report(`${String(sounding.line)}:${String(sounding.column)}`, {
          line: sounding.line,
          column: sounding.column,
          message: `${sounding.spelling} in ${sounding.track} is outside ${key.tonic} ${key.mode} and the chord under it`,
          detail: "Move it a semitone, or ignore the line if the borrowed note is intended",
        });
      }
    }
  };

export const outOfKey: Rule = defineRule({
  meta: { description: "Notes stay in the key the notes around them imply" },
  check: (context) => {
    const keys = keysOf(context.song);
    const pitched = pipe(context.soundings, Arr.filter(isPitched));
    const fits = fitsOf(keys, inChordOf(context.soundings));
    const check = checkNote({ report: reporterOf(context), keys, fits, tracks: tracksOf(pitched) });
    for (const sounding of pitched) {
      check(sounding);
    }
  },
});
