import { Array as Arr, Effect, Option, Predicate, Schema, pipe } from "effect";
import type { Scope } from "effect";

import { PartReplySchema } from "#/shared/lib/plugin/parts.ts";
import type { PartAsk, PartDone, PartReply, PartRunner } from "#/shared/lib/plugin/parts.ts";
import type { Samples } from "#/shared/lib/plugin/plugin.ts";

const PHONE = /iPhone|iPad|iPod|Android/u;
const CORES = 4;
const MEMORY = { assumed: 8, low: 4, mid: 8 } as const;
const POOL = { low: 1, mid: 2, high: 4 } as const;
const RESERVED = 1;
const ALONE = 1;

export interface PartsWorker {
  readonly url: string;
  readonly song: string;
}

const taggedError = Schema.TaggedError;

class WorkerLost extends taggedError<WorkerLost, { readonly brand: unique symbol }>()(
  "WorkerLost",
  {},
) {}

const replyOf = Schema.decodeUnknownOption(PartReplySchema);

const reported = (key: string, fallback: number): number =>
  pipe(
    Option.liftPredicate(navigator, Predicate.hasProperty(key)),
    Option.map((found) => found[key]),
    Option.filter(Predicate.isNumber),
    Option.getOrElse(() => fallback),
  );

const limitOf = (memory: number): number => {
  if (PHONE.test(navigator.userAgent) || memory < MEMORY.low) {
    return POOL.low;
  }
  if (memory < MEMORY.mid) {
    return POOL.mid;
  }
  return POOL.high;
};

const poolSize = (keys: number): number => {
  const cores = reported("hardwareConcurrency", CORES) - RESERVED;
  const limit = limitOf(reported("deviceMemory", MEMORY.assumed));
  return Math.min(keys, cores, limit);
};

const lost = (): WorkerLost => WorkerLost.make({});

const replied = (worker: Worker): Effect.Effect<PartReply, WorkerLost> =>
  Effect.callback<PartReply, WorkerLost>((resume, signal) => {
    worker.addEventListener(
      "message",
      ({ data }) => {
        const reply = Effect.fromOption(replyOf(data));
        resume(Effect.mapError(reply, lost));
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

const asked = (worker: Worker, ask: PartAsk): void => {
  worker.postMessage(ask, []);
};

const spawned = (url: string): Effect.Effect<Worker, WorkerLost, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.try({ try: () => new Worker(url, { type: "module" }), catch: lost }),
    (worker) =>
      Effect.sync(() => {
        worker.terminate();
      }),
  );

interface Queue {
  readonly next: () => Option.Option<string>;
  readonly start: (key: string) => void;
  readonly finish: (key: string) => void;
  readonly left: () => readonly string[];
}

const queueOf = (keys: readonly string[]): Queue => {
  const waiting = [...keys];
  const working = new Set<string>();
  return {
    next: () => Option.fromUndefinedOr(waiting.shift()),
    start: (key) => {
      working.add(key);
    },
    finish: (key) => {
      working.delete(key);
    },
    left: () => [...working, ...waiting],
  };
};

const taken =
  (done: (part: PartDone) => void) =>
  (reply: PartReply): void => {
    if ("stem" in reply) {
      done(reply);
    }
  };

const working =
  (queue: Queue, done: (part: PartDone) => void) =>
  (worker: Worker): Effect.Effect<void, WorkerLost> =>
    Option.match(queue.next(), {
      onNone: () => Effect.void,
      onSome: (key) =>
        Effect.gen(function* part() {
          queue.start(key);
          asked(worker, { key });
          const reply = yield* Effect.withSpan(replied(worker), "fumx.part", {
            attributes: { "song.part": key },
          });
          taken(done)(reply);
          queue.finish(key);
          yield* working(queue, done)(worker);
        }),
    });

const drained =
  (loaded: PartAsk, queue: Queue, done: (part: PartDone) => void) =>
  (worker: Worker): Effect.Effect<void, WorkerLost> =>
    Effect.gen(function* drain() {
      asked(worker, loaded);
      yield* replied(worker);
      yield* working(queue, done)(worker);
    });

const pooled =
  ({ url, song }: PartsWorker, samples: Samples) =>
  (queue: Queue, size: number, done: (part: PartDone) => void): Effect.Effect<void, WorkerLost> =>
    Effect.scoped(
      Effect.gen(function* pool() {
        const workers = yield* Effect.all(
          Arr.makeBy(size, () => spawned(url)),
          { concurrency: 1 },
        );
        yield* Effect.forEach(workers, drained({ song, samples }, queue, done), {
          concurrency: "unbounded",
          discard: true,
        });
      }),
    );

export const partsIn =
  (worker: PartsWorker) =>
  (samples: Samples): PartRunner =>
  (keys) =>
  (done) => {
    const queue = queueOf(keys);
    const size = poolSize(keys.length);
    if (size <= ALONE) {
      return Effect.succeed(keys);
    }
    return pipe(
      pooled(worker, samples)(queue, size, done),
      Effect.map(() => queue.left()),
      Effect.orElseSucceed(() => queue.left()),
    );
  };
