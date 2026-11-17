import { Array as Arr } from "effect";

import type { Layers } from "./types.ts";

export const isSliced =
  (layers: Layers) =>
  (layer: string): boolean =>
    Arr.contains(layers.sliced ?? [], layer);

export const isParted =
  (layers: Layers) =>
  (layer: string): boolean =>
    isSliced(layers)(layer) || Arr.contains(layers.segmented ?? [], layer);

export const isLayer =
  (layers: Layers) =>
  (layer: string): boolean =>
    Arr.contains(layers.order, layer);
