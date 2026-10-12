import type { CSSProperties, ReactNode } from "react";

import { toWavyLetters } from "#/shared/lib";
import { WavyLetters } from "#/shared/ui";

const NAME = "masseater";

const letters = toWavyLetters(NAME);

const titleStyle: CSSProperties = { "--n": NAME.length };

const Name = (): ReactNode => (
  <h1
    aria-label={NAME}
    className="vt-site-name stage-title font-display text-7xl select-none sm:text-9xl"
    style={titleStyle}
  >
    <WavyLetters letters={letters} />
  </h1>
);

export { Name };
