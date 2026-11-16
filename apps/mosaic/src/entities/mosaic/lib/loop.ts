import { Option } from "effect";

import type { ViewerStore } from "#/entities/mosaic/model/viewer.ts";

import { advance } from "./motion.ts";
import type { Renderer } from "./renderer-contract.ts";
import type { Scene } from "./scene.ts";
import { settle } from "./scene.ts";
import type { Sprites } from "./sprites.ts";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = (): boolean => globalThis.matchMedia(REDUCED_MOTION).matches;

const advanceFor =
  (reduced: boolean, now: number) =>
  (scene: Scene): Scene => {
    const advanced = advance(now)(scene);
    if (reduced && advanced.motion.status === "flying") {
      return settle(advanced.motion.to)(advanced);
    }
    return advanced;
  };

const needsDraw = (
  scene: Scene,
  drawn: Option.Option<Scene>,
  state: Readonly<{ dirty: boolean; now: number; renderer: Renderer }>,
): boolean =>
  state.dirty ||
  !Option.contains(drawn, scene) ||
  scene.motion.status !== "still" ||
  state.renderer.animating(state.now)(scene);

const arriveAfterIntro = ({
  store,
  renderer,
  scene,
  now,
}: Readonly<{ store: ViewerStore; renderer: Renderer; scene: Scene; now: number }>): void => {
  if (!renderer.animating(now)(scene)) {
    store.arrive();
  }
};

export interface Loop {
  readonly store: ViewerStore;
  readonly renderer: Renderer;
  readonly sprites: Sprites;
  readonly dirty: () => boolean;
  readonly signal: AbortSignal;
}

export const startLoop = ({ store, renderer, sprites, dirty, signal }: Loop): void => {
  const reduced = prefersReducedMotion();
  let drawn: Option.Option<Scene> = Option.none();
  const tick = (scene: Scene, now: number): Option.Option<Scene> => {
    arriveAfterIntro({ store, renderer, scene, now });
    if (!needsDraw(scene, drawn, { dirty: dirty(), now, renderer })) {
      return drawn;
    }
    renderer.draw({ scene, sprites, now });
    return Option.some(scene);
  };
  const frame = (now: number): void => {
    if (signal.aborted) {
      return;
    }
    store.step(advanceFor(reduced, now));
    const viewer = store.read();
    if (viewer.status === "ready") {
      drawn = tick(viewer.scene, now);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

export interface Invalidation {
  readonly mark: () => void;
  readonly take: () => boolean;
}

export const createInvalidation = (): Invalidation => {
  let dirty = true;
  return {
    mark: () => {
      dirty = true;
    },
    take: () => {
      const was = dirty;
      dirty = false;
      return was;
    },
  };
};
