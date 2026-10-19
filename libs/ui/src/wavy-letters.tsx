import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { WavyLetter } from "./to-wavy-letters.ts";

const WavyLetters = ({ letters }: Readonly<{ letters: readonly WavyLetter[] }>): ReactNode =>
  pipe(
    letters,
    Arr.map(({ key, letter, style }) => (
      <span aria-hidden className="stage-letter inline-block" key={key} style={style}>
        {letter}
      </span>
    )),
  );

export { WavyLetters };
