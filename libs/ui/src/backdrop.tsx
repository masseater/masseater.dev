import { MeshGradient } from "@paper-design/shaders-react";
import { Record as Rec } from "effect";
import type { ReactNode } from "react";

import { backdropPalette } from "./backdrop-palette.ts";
import type { CssVariables } from "./css-variables.ts";

const COLORS = Rec.values(backdropPalette);

const MAX_PIXEL_COUNT = 230_400;

const STILL_COLORS: CssVariables = {
  "--still-base": backdropPalette.base,
  "--still-sky": backdropPalette.sky,
  "--still-pink": backdropPalette.pink,
  "--still-amber": backdropPalette.amber,
  "--still-indigo": backdropPalette.indigo,
  "--still-mint": backdropPalette.mint,
};

const Backdrop = (): ReactNode => (
  <div aria-hidden className="vt-backdrop pointer-events-none absolute inset-0 -z-10">
    <div className="stage-backdrop stage-backdrop-still absolute" style={STILL_COLORS}>
      <MeshGradient
        className="size-full"
        colors={COLORS}
        distortion={0.85}
        grainOverlay={0.06}
        maxPixelCount={MAX_PIXEL_COUNT}
        minPixelRatio={1}
        speed={0.2}
        swirl={0.35}
      />
    </div>
    <div className="stage-spotlight absolute top-0 left-0 rounded-full" />
  </div>
);

export { Backdrop };
