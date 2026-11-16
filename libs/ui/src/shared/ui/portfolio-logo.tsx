import type { CSSProperties, ReactNode } from "react";

import { followPointer, releasePointer } from "#/shared/lib/pointer.ts";
import { portfolio } from "#/shared/lib/portfolio.ts";
import { toWavyLetters } from "#/shared/lib/to-wavy-letters.ts";

import { WavyLetters } from "./wavy-letters.tsx";

const letters = toWavyLetters(portfolio.name);

const logoStyle: CSSProperties = { "--n": portfolio.name.length };

export const PortfolioLogo = (): ReactNode => (
  <a
    aria-label={portfolio.name}
    className="stage vt-site-name font-display inline-block shrink-0 text-3xl whitespace-nowrap select-none"
    href={`${portfolio.url}/`}
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
    style={logoStyle}
  >
    <WavyLetters letters={letters} />
  </a>
);
