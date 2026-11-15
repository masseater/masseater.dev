import { Effect } from "effect";

type Flush = () => Effect.Effect<void>;

const flushes = new Set<Flush>();

const beforeClosing = (flush: Flush): (() => void) => {
  flushes.add(flush);
  return () => {
    flushes.delete(flush);
  };
};

const flushAll: Effect.Effect<void> = Effect.suspend(() =>
  Effect.forEach(flushes, (flush) => flush(), { concurrency: "unbounded", discard: true }),
);

export { beforeClosing, flushAll };
