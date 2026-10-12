type WavyLetter = Readonly<{ key: string; letter: string; style: Readonly<{ "--i": number }> }>;

const toWavyLetters = (text: string): readonly WavyLetter[] =>
  Array.from(text, (letter, index) => ({
    key: `${letter}-${index}`,
    letter,
    style: { "--i": index },
  }));

export type { WavyLetter };
export { toWavyLetters };
