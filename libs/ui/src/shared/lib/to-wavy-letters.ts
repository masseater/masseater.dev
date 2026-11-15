import type { CssVariables } from "./css-variables.ts";

export type WavyLetter = Readonly<{ key: string; letter: string; style: CssVariables }>;

export const toWavyLetters = (text: string): readonly WavyLetter[] =>
  Array.from(text, (letter, index) => ({
    key: `${letter}-${index}`,
    letter,
    style: { "--i": index },
  }));
