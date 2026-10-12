import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

import { site } from "#/shared/config";
import { followPointer, releasePointer, toWavyLetters } from "#/shared/lib";
import { WavyLetters } from "#/shared/ui";

const letters = toWavyLetters(site.name);

const logoStyle: CSSProperties = { "--n": site.name.length };

const SiteLogo = (): ReactNode => (
  <Link
    aria-label={site.name}
    className="stage vt-site-name font-display inline-block text-3xl select-none"
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
