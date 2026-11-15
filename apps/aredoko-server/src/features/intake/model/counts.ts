import { Array, pipe } from "effect";

export const placedCount = (placed: readonly boolean[]): number =>
  pipe(placed, Array.filter(Boolean), Array.length);

export const bundleCount = (placed: readonly boolean[]): number =>
  placedCount([pipe(placed, Array.some(Boolean))]);
