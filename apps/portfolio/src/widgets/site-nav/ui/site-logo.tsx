import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

import { site } from "#/shared/config";
import { followPointer, releasePointer, toWavyLetters } from "#/shared/lib";
import { WavyLetters } from "#/shared/ui";

const letters = toWavyLetters(site.name);

const logoStyle: CSSProperties = { "--n": site.name.length };

const SIZE_CLASS = {
  large: "stage vt-site-name font-display inline-block px-2 text-5xl select-none sm:text-6xl",
  small: "stage vt-site-name font-display inline-block text-3xl select-none",
} as const;

const SiteLogo = ({ size }: Readonly<{ size: keyof typeof SIZE_CLASS }>): ReactNode => (
  <Link
    aria-label={site.name}
    className={SIZE_CLASS[size]}
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
