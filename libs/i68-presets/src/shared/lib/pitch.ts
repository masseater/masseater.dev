import { Array as Arr, Option, String as Str, pipe } from "effect";

const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const PITCH = /^(?<letter>[A-G])(?<accidental>##|#|bb|b)?(?<octave>-?\d+)$/u;
const OCTAVE = 12;
const OCTAVE_OFFSET = 1;
const SHARP = "#";
const FLAT = "b";

export const pitchClassOf = (midi: number): number => ((midi % OCTAVE) + OCTAVE) % OCTAVE;

export const nameOf = (midi: number): string =>
  `${Option.getOrElse(Arr.get(NAMES, pitchClassOf(midi)), () => "?")}${String(Math.floor(midi / OCTAVE) - OCTAVE_OFFSET)}`;

const countOf =
  (mark: string) =>
  (text: string): number =>
    pipe(
      Str.split(text, ""),
      Arr.filter((character) => character === mark),
    ).length;

interface PitchParts {
  readonly letter: string;
  readonly accidental: string;
  readonly octave: string;
}

const partsOf = (name: string): Option.Option<PitchParts> =>
  pipe(
    Option.fromNullishOr(PITCH.exec(name)),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) =>
      Option.all({
        letter: Option.fromNullishOr(groups["letter"]),
        accidental: Option.some(groups["accidental"] ?? ""),
        octave: Option.fromNullishOr(groups["octave"]),
      }),
    ),
  );

export const midiOf = (name: string): Option.Option<number> =>
  pipe(
    partsOf(name),
    Option.flatMap((parts) =>
      pipe(
        Arr.findFirstIndex(NAMES, (candidate) => candidate === parts.letter),
        Option.map(
          (letter) =>
            (Number(parts.octave) + OCTAVE_OFFSET) * OCTAVE +
            letter +
            countOf(SHARP)(parts.accidental) -
            countOf(FLAT)(parts.accidental),
        ),
      ),
    ),
  );

export const namesOf = (midis: readonly number[]): string =>
  pipe(midis, Arr.map(nameOf), Arr.join(", "));
