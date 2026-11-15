import { followPointer, releasePointer, toWavyLetters, WavyLetters } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

const NAME = "masseater";

const letters = toWavyLetters(NAME);

const logoStyle: CSSProperties = { "--n": NAME.length };

const PortalLogo = (): ReactNode => (
  <Link
    aria-label={NAME}
    className="stage font-display inline-block shrink-0 text-2xl whitespace-nowrap select-none sm:text-3xl"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
    style={logoStyle}
    to="/"
  >
    <WavyLetters letters={letters} />
  </Link>
);

export { PortalLogo };
