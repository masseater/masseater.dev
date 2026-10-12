import type { ReactNode } from "react";

import type { WavyLetter } from "#/shared/lib";

const WavyLetters = ({ letters }: Readonly<{ letters: readonly WavyLetter[] }>): ReactNode =>
  letters.map(({ key, letter, style }) => (
    <span aria-hidden className="stage-letter inline-block" key={key} style={style}>
      {letter}
    </span>
  ));

export { WavyLetters };
