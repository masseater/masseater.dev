import type { CssVariables } from "./css-variables.ts";

type WavyLetter = Readonly<{ key: string; letter: string; style: CssVariables }>;

const toWavyLetters = (text: string): readonly WavyLetter[] =>
  Array.from(text, (letter, index) => ({
    key: `${letter}-${index}`,
    letter,
    style: { "--i": index },
  }));

export type { WavyLetter };
export { toWavyLetters };
