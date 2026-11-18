import type { KeySpan, Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { keyAt, keysOf } from "#/shared/lib/keys.ts";
import { nameOf, pitchClassOf } from "#/shared/lib/pitch.ts";
import { hasRole, isPitched, reporterOf, soundingAt } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

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

type InChord = (sounding: Sounding) => boolean;

const inChordOf = (soundings: readonly Sounding[]): InChord => {
  const harmony = pipe(soundings, Arr.filter(hasRole(["bass", "harmony"])));
  return (sounding) =>
    pipe(
      soundingAt(harmony)(sounding.start),
      Arr.some((other) => pitchClassOf(other.midi) === pitchClassOf(sounding.midi)),
    );
};

const checkNote =
  (report: Reporter, keys: readonly KeySpan[], inChord: InChord) =>
  (sounding: Sounding): void => {
    for (const key of Option.toArray(keyAt(keys)(sounding.bar))) {
      if (!inScale(key)(sounding.midi) && !inChord(sounding)) {
        report(`${String(sounding.line)}:${String(sounding.column)}`, {
          line: sounding.line,
          column: sounding.column,
          message: `${nameOf(sounding.midi)} in ${sounding.track} is outside ${key.tonic} ${key.mode} and the chord under it`,
          detail: "Move it a semitone, or ignore the line if the borrowed note is intended",
        });
      }
    }
  };

export const outOfKey: Rule = defineRule({
  meta: { description: "Notes stay in the key the notes around them imply" },
  check: (context) => {
    const keys = keysOf(context.song);
    const check = checkNote(reporterOf(context), keys, inChordOf(context.soundings));
    for (const sounding of pipe(context.soundings, Arr.filter(isPitched))) {
      check(sounding);
    }
  },
});
