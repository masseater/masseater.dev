import { MeshGradient } from "@paper-design/shaders-react";
import type { ReactNode } from "react";

const COLORS = ["#ffffff", "#dbeafe", "#fbcfe8", "#fef3c7", "#c7d2fe", "#d1fae5"];

const Backdrop = (): ReactNode => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
    <div className="stage-backdrop stage-backdrop-still absolute">
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
