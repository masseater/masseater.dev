import type { CSSProperties, ReactNode } from "react";

import { followPointer, releasePointer } from "./pointer.ts";
import { portfolio } from "./portfolio.ts";
import { toWavyLetters } from "./to-wavy-letters.ts";
import { WavyLetters } from "./wavy-letters.tsx";

const letters = toWavyLetters(portfolio.name);

const logoStyle: CSSProperties = { "--n": portfolio.name.length };

const PortfolioLogo = (): ReactNode => (
  <a
    aria-label={portfolio.name}
    className="stage vt-site-name font-display inline-block shrink-0 text-3xl whitespace-nowrap select-none"
    href="/"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
    style={logoStyle}
  >
    <WavyLetters letters={letters} />
  </a>
);

export { PortfolioLogo };
