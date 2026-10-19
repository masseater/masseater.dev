import { MeshGradient } from "@paper-design/shaders-react";
import type { ReactNode } from "react";

import type { CssVariables } from "./css-variables.ts";

const PALETTE = {
  base: "#ffffff",
  sky: "#dbeafe",
  pink: "#fbcfe8",
  amber: "#fef3c7",
  indigo: "#c7d2fe",
  mint: "#d1fae5",
} as const;

const COLORS = Object.values(PALETTE);

const STILL_COLORS: CssVariables = {
  "--still-base": PALETTE.base,
  "--still-sky": PALETTE.sky,
  "--still-pink": PALETTE.pink,
  "--still-amber": PALETTE.amber,
  "--still-indigo": PALETTE.indigo,
  "--still-mint": PALETTE.mint,
};

const Backdrop = (): ReactNode => (
  <div aria-hidden className="vt-backdrop pointer-events-none absolute inset-0 -z-10">
    <div className="stage-backdrop stage-backdrop-still absolute" style={STILL_COLORS}>
      <MeshGradient
        className="size-full"
        colors={COLORS}
        distortion={0.85}
        grainOverlay={0.06}
        speed={0.2}
        swirl={0.35}
      />
    </div>
    <div className="stage-spotlight absolute top-0 left-0 rounded-full" />
  </div>
);

export { Backdrop };
