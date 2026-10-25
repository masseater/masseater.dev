import { followPointer, releasePointer, toWavyLetters, WavyLetters } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

import { site } from "#/shared/config";

const letters = toWavyLetters(site.name);

const logoStyle: CSSProperties = { "--n": site.name.length };

const SiteLogo = (): ReactNode => (
  <Link
    aria-label={site.name}
    className="stage vt-site-name font-display inline-block shrink-0 text-xl whitespace-nowrap select-none sm:text-3xl"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
    style={logoStyle}
    to="/"
  >
    <WavyLetters letters={letters} />
  </Link>
);

export { SiteLogo };
