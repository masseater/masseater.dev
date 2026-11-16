import { toWavyLetters, WavyLetters } from "@masseater.dev/ui";
import type { CSSProperties, ReactNode } from "react";

import { site } from "#/shared/config/index.ts";

const letters = toWavyLetters(site.name);

const titleStyle: CSSProperties = { "--n": site.name.length };

export const Name = (): ReactNode => (
  <h1
    aria-label={site.name}
    className="vt-site-name stage-title font-display text-7xl select-none sm:text-9xl"
    style={titleStyle}
  >
    <WavyLetters letters={letters} />
  </h1>
);
