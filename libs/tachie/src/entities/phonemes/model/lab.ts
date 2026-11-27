import { Array as Arr, Option, String as Str, pipe } from "effect";

export interface Phoneme {
  readonly start: number;
  readonly end: number;
  readonly phoneme: string;
}

export interface PhonemePosition {
  readonly phonemes: readonly Phoneme[];
  readonly index: number;
  readonly phoneme: Phoneme;
  readonly progress: number;
}

const LAB_UNITS_PER_SECOND = 10_000_000;
const LINE = /^(?<start>[\d.]+)\s+(?<end>[\d.]+)\s+(?<phoneme>.+)$/u;
const NOTHING = 0;

const phonemeOf = (line: string): Option.Option<Phoneme> =>
  pipe(
    Option.fromNullishOr(LINE.exec(line)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.map(({ start = "", end = "", phoneme = "" }) => ({
      start: Number(start) / LAB_UNITS_PER_SECOND,
      end: Number(end) / LAB_UNITS_PER_SECOND,
      phoneme: Str.trim(phoneme),
    })),
  );

export const parseLab = (text: string): readonly Phoneme[] =>
  pipe(
    Str.split(/[\r\n]+/u)(text),
    Arr.flatMap((line) => Option.toArray(phonemeOf(line))),
  );

export const formatLab = (phonemes: readonly Phoneme[]): string =>
  pipe(
    phonemes,
    Arr.map(
      ({ start, end, phoneme }) =>
        `${String(Math.round(start * LAB_UNITS_PER_SECOND))} ${String(Math.round(end * LAB_UNITS_PER_SECOND))} ${phoneme}`,
    ),
    Arr.join("\n"),
  );

const progressOf = ({ start, end }: Phoneme, time: number): number => {
  const duration = end - start;
  if (duration > NOTHING) {
    return (time - start) / duration;
  }
  return NOTHING;
};

export const phonemeAt = ({
  phonemes,
  time,
}: Readonly<{ phonemes: readonly Phoneme[]; time: number }>): Option.Option<PhonemePosition> =>
  pipe(
    phonemes,
    Arr.findFirstIndex(({ start, end }) => start <= time && time < end),
    Option.flatMap((index) =>
      pipe(
        Arr.get(phonemes, index),
        Option.map((phoneme) => ({
          phonemes,
          index,
          phoneme,
          progress: progressOf(phoneme, time),
        })),
      ),
    ),
  );
