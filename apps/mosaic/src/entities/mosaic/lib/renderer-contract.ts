import type { Effect } from "effect";

import type { Scene } from "./scene";
import type { Sprites } from "./sprites";

export interface RenderFrame {
  readonly scene: Scene;
  readonly sprites: Sprites;
  readonly now: number;
}

export interface Renderer {
  readonly draw: (frame: RenderFrame) => void;
  readonly animating: (now: number) => (scene: Scene) => boolean;
  readonly prepare: (sprites: Sprites) => Effect.Effect<void>;
}

export interface Target {
  readonly canvas: HTMLCanvasElement;
  readonly cells: readonly number[];
  readonly onReady: () => void;
  readonly signal: AbortSignal;
}
