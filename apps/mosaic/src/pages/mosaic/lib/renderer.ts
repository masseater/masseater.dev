import { Effect, Option } from "effect";

import { createGpuRenderer } from "./gpu-renderer";
import { drawScene, isFading } from "./render";
import type { Renderer, Target } from "./renderer-contract";

const ACCENT_PROPERTY = "--primary";

const canvasRenderer = (canvas: HTMLCanvasElement, accent: string): Option.Option<Renderer> =>
  Option.map(Option.fromNullishOr(canvas.getContext("2d")), (context) => ({
    draw: (frame) => {
      drawScene({ ...frame, context, accent });
    },
    animating: isFading,
    prepare: () => Effect.void,
  }));

const fallback = ({ canvas, signal }: Target, accent: string): Option.Option<Renderer> => {
  if (signal.aborted) {
    return Option.none();
  }
  return canvasRenderer(canvas, accent);
};

const createRenderer = (target: Target): Effect.Effect<Option.Option<Renderer>> => {
  const accent = getComputedStyle(target.canvas).getPropertyValue(ACCENT_PROPERTY);
  return Effect.map(createGpuRenderer({ ...target, accent }), (gpu) =>
    Option.orElse(gpu, () => fallback(target, accent)),
  );
};

export { createRenderer };
