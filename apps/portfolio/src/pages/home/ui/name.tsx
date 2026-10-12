import type { CSSProperties, ReactNode } from "react";

const NAME = "masseater";

const titleStyle: CSSProperties = { "--n": NAME.length };

const letterStyle = (index: number): CSSProperties => ({ "--i": index });

const letters = Array.from(NAME, (letter, index) => ({
  key: `${letter}-${index}`,
  letter,
  style: letterStyle(index),
}));

const Name = (): ReactNode => (
  <h1
    aria-label={NAME}
    className="stage-title font-display text-7xl select-none sm:text-9xl"
    style={titleStyle}
  >
    {letters.map(({ key, letter, style }) => (
      <span aria-hidden className="stage-letter inline-block" key={key} style={style}>
        {letter}
      </span>
    ))}
  </h1>
);

export { Name };
