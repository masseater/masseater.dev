import { Array as Arr, Option, pipe } from "effect";

import type { LayerTree, Visibility } from "#/entities/character/index.ts";
import { composeLayers } from "#/features/draw-layers/index.ts";

const KEPT_COMPOSITES = 64;
const ORIGIN = 0;
const MIRROR = -1;
const SAME = 1;

const composites = new WeakMap<LayerTree, Map<string, Option.Option<HTMLCanvasElement>>>();

const keyOf = (visible: readonly boolean[]): string =>
  pipe(
    visible,
    Arr.map((shown) => String(Number(shown))),
    Arr.join(""),
  );

const compositeOf = (
  tree: LayerTree,
  visible: readonly boolean[],
): Option.Option<HTMLCanvasElement> => {
  const cache = composites.getOrInsertComputed(tree, () => new Map());
  const key = keyOf(visible);
  if (!cache.has(key) && cache.size >= KEPT_COMPOSITES) {
    pipe(
      Option.fromNullishOr(cache.keys().next().value),
      Option.map((oldest) => cache.delete(oldest)),
    );
  }
  return cache.getOrInsertComputed(key, () => composeLayers({ tree, visible }));
};

const scaleOf = (mirrored: boolean): number => {
  if (mirrored) {
    return MIRROR;
  }
  return SAME;
};

export const paintCharacter = ({
  context,
  tree,
  visibility,
}: Readonly<{
  context: CanvasRenderingContext2D;
  tree: LayerTree;
  visibility: Visibility;
}>): void => {
  const mirroredX = visibility.flip === "x" || visibility.flip === "xy";
  const mirroredY = visibility.flip === "y" || visibility.flip === "xy";
  context.setTransform(SAME, ORIGIN, ORIGIN, SAME, ORIGIN, ORIGIN);
  context.clearRect(ORIGIN, ORIGIN, tree.width, tree.height);
  context.setTransform(
    scaleOf(mirroredX),
    ORIGIN,
    ORIGIN,
    scaleOf(mirroredY),
    Number(mirroredX) * tree.width,
    Number(mirroredY) * tree.height,
  );
  pipe(
    compositeOf(tree, visibility.visible),
    Option.map((composite) => {
      context.drawImage(composite, ORIGIN, ORIGIN);
      return composite;
    }),
  );
};
