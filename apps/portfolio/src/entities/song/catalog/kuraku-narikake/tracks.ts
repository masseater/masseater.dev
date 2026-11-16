import type { Samples } from "@masseater.dev/daw-view";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Sheet } from "#/entities/song/model/take.ts";

import type { Held } from "./deck.ts";
import type { Engine, Stem } from "./program/engine.js";
import type { Session } from "./program/song.js";
import table from "./samples.json";
import { ReplySchema } from "./track-messages.ts";
import type { Ask, Reply } from "./track-messages.ts";

const TRACK_SHARE = 0.84;
const PHONE = /iPhone|iPad|iPod|Android/u;
const CORES = 4;
const MEMORY = { assumed: 8, low: 4, mid: 8 } as const;
const POOL = { low: 1, mid: 2, high: 4, least: 1 } as const;
const RESERVED = 1;
const BREATH = "0 millis";

export interface Tracking {
  readonly engine: Engine;
  readonly session: Session;
  readonly samples: Samples;
  readonly sheet: Sheet;
  readonly held: Held;
}

const taggedError = Schema.TaggedError;

class WorkerLost extends taggedError<WorkerLost, { readonly brand: unique symbol }>()(
  "WorkerLost",
  {},
) {}

const replyOf = Schema.decodeUnknownOption(ReplySchema);

const reported = (key: string, fallback: number): number => {
  const value: unknown = Reflect.get(navigator, key);
  if (typeof value === "number") {
    return value;
  }
  return fallback;
};

const limitOf = (memory: number): number => {
  if (PHONE.test(navigator.userAgent) || memory < MEMORY.low) {
    return POOL.low;
  }
  if (memory < MEMORY.mid) {
    return POOL.mid;
  }
  return POOL.high;
};

const poolSize = (): number => {
  const cores = reported("hardwareConcurrency", CORES) - RESERVED;
  const limit = limitOf(reported("deviceMemory", MEMORY.assumed));
  return Math.max(POOL.least, Math.min(cores, limit));
};

const lost = (): WorkerLost => WorkerLost.make({});

const replied = (worker: Worker): Effect.Effect<Reply, WorkerLost> =>
  Effect.callback<Reply, WorkerLost>((resume, signal) => {
    worker.addEventListener(
      "message",
      ({ data }) => {
        const parsed = Effect.fromOption(replyOf(data));
        resume(Effect.mapError(parsed, lost));
      },
      { once: true, signal },
    );
    worker.addEventListener(
      "error",
      () => {
        resume(Effect.fail(lost()));
      },
      { once: true, signal },
    );
  });

const asked = (worker: Worker, ask: Ask): void => {
  worker.postMessage(ask, []);
};

const spawned = Effect.acquireRelease(
  Effect.try({
    try: () => new Worker(new URL("./track-worker.ts", import.meta.url), { type: "module" }),
    catch: lost,
  }),
  (worker) =>
    Effect.sync(() => {
      worker.terminate();
    }),
);

interface Queue {
  readonly next: () => Option.Option<string>;
  readonly start: (name: string) => void;
  readonly finish: (name: string) => void;
  readonly left: () => readonly string[];
}

interface Taker {
  readonly take: (name: string, stem: Stem) => void;
  readonly drums: () => readonly string[];
}

const queueOf = (names: readonly string[]): Queue => {
  const waiting = [...names];
  const working = new Set<string>();
  return {
    next: () => Option.fromUndefinedOr(waiting.shift()),
    start: (name) => {
      working.add(name);
    },
    finish: (name) => {
      working.delete(name);
    },
    left: () => [...working, ...waiting],
  };
};

const built =
  (tracking: Tracking, taker: Taker) =>
  (reply: Reply): void => {
    if ("stem" in reply) {
      tracking.sheet.log.push(...reply.entries);
      taker.take(reply.name, reply.stem);
    }
  };

const working =
  (tracking: Tracking, queue: Queue, taker: Taker) =>
  (worker: Worker): Effect.Effect<void, WorkerLost> =>
    Option.match(queue.next(), {
      onNone: () => Effect.void,
      onSome: (name) =>
        Effect.gen(function* track() {
          queue.start(name);
          asked(worker, { name });
          const reply = yield* replied(worker);
          built(tracking, taker)(reply);
          queue.finish(name);
          yield* working(tracking, queue, taker)(worker);
        }),
    });

const drained =
  (tracking: Tracking, queue: Queue, taker: Taker) =>
  (worker: Worker): Effect.Effect<void, WorkerLost> =>
    Effect.gen(function* drain() {
      asked(worker, { samples: tracking.samples, table });
      yield* replied(worker);
      yield* working(tracking, queue, taker)(worker);
    });

const pooled = (tracking: Tracking, queue: Queue, taker: Taker): Effect.Effect<void, WorkerLost> =>
  Effect.scoped(
    Effect.gen(function* pool() {
      const workers = yield* Effect.all(Arr.makeBy(poolSize(), () => spawned));
      yield* Effect.forEach(workers, drained(tracking, queue, taker), {
        concurrency: "unbounded",
        discard: true,
      });
    }),
  );

const here = (tracking: Tracking, names: readonly string[], taker: Taker): Effect.Effect<void> =>
  Effect.forEach(
    names,
    (name) =>
      Effect.andThen(
        Effect.sleep(BREATH),
        Effect.sync(() => {
          taker.take(name, tracking.session.track(name));
        }),
      ),
    { discard: true },
  );

const takerOf = (tracking: Tracking): Taker => {
  const total = tracking.session.cost.length;
  const drums = new Set<string>();
  const done = { count: 0 };
  return {
    take: (name, stem) => {
      const index = tracking.session.tracks.indexOf(name);
      const unpacked = tracking.engine.unpack(stem);
      tracking.held.deck.write(tracking.held.slotOf(index, stem.drum), unpacked.L, unpacked.R);
      if (stem.drum) {
        drums.add(name);
      }
      done.count += 1;
      tracking.sheet.progress((done.count / total) * TRACK_SHARE, Str.toLowerCase(name));
    },
    drums: () => [...drums],
  };
};

export const renderTracks = (tracking: Tracking): Effect.Effect<readonly string[]> =>
  Effect.gen(function* tracks() {
    const taker = takerOf(tracking);
    const queue = queueOf(tracking.session.cost);
    yield* pipe(
      pooled(tracking, queue, taker),
      Effect.catch(() => here(tracking, queue.left(), taker)),
    );
    return taker.drums();
  });
