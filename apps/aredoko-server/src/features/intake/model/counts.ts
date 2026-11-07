import { Array, pipe } from "effect";

const placedCount = (placed: readonly boolean[]): number =>
  pipe(placed, Array.filter(Boolean), Array.length);

const bundleCount = (placed: readonly boolean[]): number =>
  placedCount([pipe(placed, Array.some(Boolean))]);

export { bundleCount, placedCount };
