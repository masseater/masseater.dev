import { Effect } from "effect";

const flushes = new Set<() => Effect.Effect<void>>();

const beforeClosing = (flush: () => Effect.Effect<void>): (() => void) => {
  flushes.add(flush);
  return () => {
    flushes.delete(flush);
  };
};

const flushAll: Effect.Effect<void> = Effect.suspend(() =>
  Effect.forEach(flushes, (flush) => flush(), { concurrency: "unbounded", discard: true }),
);

export { beforeClosing, flushAll };
