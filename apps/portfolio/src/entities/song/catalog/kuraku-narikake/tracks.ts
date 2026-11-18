import type { Samples } from "@masseater.dev/daw-view";
import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { unpacked } from "#/entities/song/lib/studio/stem.ts";
import type { Sheet } from "#/entities/song/model/take.ts";

import type { Held } from "./deck.ts";
import type { Kuraku } from "./engine/kuraku.ts";
import { MIX } from "./engine/score.ts";
import { trackOf } from "./engine/track.ts";
import type { TrackStem } from "./engine/track.ts";
import { table } from "./session.ts";
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
  readonly kuraku: Kuraku;
  readonly clips: string;
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
  readonly take: (stem: TrackStem) => void;
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
      taker.take(reply.stem);
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
          const reply = yield* Effect.withSpan(replied(worker), "kuraku.track", {
            attributes: { "song.track": name },
          });
          built(tracking, taker)(reply);
          queue.finish(name);
          yield* working(tracking, queue, taker)(worker);
        }),
    });

const drained =
  (tracking: Tracking, queue: Queue, taker: Taker) =>
  (worker: Worker): Effect.Effect<void, WorkerLost> =>
    Effect.gen(function* drain() {
      asked(worker, { samples: tracking.samples, table, clips: tracking.clips });
      yield* replied(worker);
      yield* working(tracking, queue, taker)(worker);
    });

const pooled = (tracking: Tracking, queue: Queue, taker: Taker): Effect.Effect<void, WorkerLost> =>
  Effect.scoped(
    Effect.gen(function* pool() {
      const workers = yield* Effect.all(
        Arr.makeBy(poolSize(), () => spawned),
        { concurrency: 1 },
      );
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
          taker.take(trackOf(tracking.kuraku)(name));
        }),
      ),
    { concurrency: 1, discard: true },
  );

const takerOf = (tracking: Tracking): Taker => {
  const total = MIX.tracks.length;
  const drums = new Set<string>();
  const done = { count: 0 };
  return {
    take: (stem) => {
      const { left, right } = unpacked(stem);
      tracking.held.deck.write(tracking.held.slotOf(stem.name, stem.drum), left, right);
      if (stem.drum) {
        drums.add(stem.name);
      }
      done.count += 1;
      tracking.sheet.progress((done.count / total) * TRACK_SHARE, Str.toLowerCase(stem.name));
    },
    drums: () => [...drums],
  };
};

export const renderTracks = (tracking: Tracking): Effect.Effect<void> =>
  Effect.gen(function* tracks() {
    const taker = takerOf(tracking);
    const queue = queueOf(
      pipe(
        MIX.tracks,
        Arr.map(({ name }) => name),
      ),
    );
    yield* pipe(
      pooled(tracking, queue, taker),
      Effect.catch(() => here(tracking, queue.left(), taker)),
    );
  });
