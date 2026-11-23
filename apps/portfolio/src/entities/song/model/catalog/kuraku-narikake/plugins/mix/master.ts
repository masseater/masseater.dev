import type { Block } from "@masseater.dev/fumx-studio/live/tape";
import { reached } from "@masseater.dev/fumx-studio/studio/breathe";
import type { Progressing } from "@masseater.dev/fumx-studio/studio/breathe";
import { limitCurve } from "@masseater.dev/fumx-studio/studio/limiter";
import { Array as Arr, Effect, pipe } from "effect";

import { coreOf, curvesFor } from "./core-state.ts";
import type { Core, MasterCurves } from "./core-state.ts";
import { finished, processed } from "./core.ts";
import { MASTERING } from "./mastering.ts";

const CHUNK = 262_144;
const REPORT_EVERY = 8;
const LAST_OF_REPORT = 7;
const ONE = 1;
const FIRST = 0;
const STAGES = {
  master: { share: 0.84, label: "master" },
  span: 0.12,
  limiter: { share: 0.96, label: "limiter" },
  done: { share: 1, label: "done" },
} as const;

export interface BlockSource {
  readonly frames: number;
  readonly block: (index: number) => Promise<readonly Block[]>;
}

export interface Mastering {
  readonly frames: number;
  readonly drums: readonly boolean[];
  readonly deck: BlockSource;
  readonly progress: Progressing;
}

export interface MasterOut {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly curves: MasterCurves;
}

interface Cache {
  readonly block: (index: number) => readonly Block[];
  readonly fetch: (from: number, to: number) => Effect.Effect<void>;
}

const cacheOf = (deck: BlockSource): Cache => {
  const held = new Map<number, readonly Block[]>();
  const evicted = (first: number): void => {
    for (const index of held.keys()) {
      if (index < first) {
        held.delete(index);
      }
    }
  };
  return {
    block: (index) => held.get(index) ?? [],
    fetch: (from, to) =>
      Effect.gen(function* fetch() {
        const first = Math.floor(from / deck.frames);
        evicted(first);
        const wanted = pipe(
          Arr.range(first, Math.floor((to - ONE) / deck.frames)),
          Arr.filter((index) => !held.has(index)),
        );
        const blocks = yield* Effect.forEach(
          wanted,
          (index) => Effect.promise(() => deck.block(index)),
          { concurrency: "unbounded" },
        );
        for (const [at, index] of wanted.entries()) {
          held.set(index, blocks[at] ?? []);
        }
      }),
  };
};

interface Pass {
  readonly frames: number;
  readonly cache: Cache;
  readonly reach: ReturnType<typeof reached>;
}

const chunksMastered = Effect.fn("kuraku.master.chunks")(function* chunksMastered(
  core: Core,
  { frames, cache, reach }: Pass,
) {
  const out = { left: new Float32Array(frames), right: new Float32Array(frames), mono: false };
  const process = processed({ detect: true })(core);
  for (let at = FIRST; at < frames; at += CHUNK) {
    yield* cache.fetch(at, Math.min(frames, at + CHUNK));
    process(out.left.subarray(at), out.right.subarray(at), Math.min(CHUNK, frames - at));
    if ((at / CHUNK) % REPORT_EVERY === LAST_OF_REPORT) {
      yield* reach({
        share: STAGES.master.share + (STAGES.span * at) / frames,
        label: STAGES.master.label,
      });
    }
  }
  return out;
});

export const deckMastered = Effect.fn("kuraku.master")(function* deckMastered({
  frames,
  drums,
  deck,
  progress,
}: Mastering) {
  const reach = reached(progress);
  yield* reach(STAGES.master);
  const cache = cacheOf(deck);
  const core = coreOf({
    frames,
    drums,
    tape: { frames: deck.frames, block: cache.block },
    curves: curvesFor(frames),
  });
  const out = yield* chunksMastered(core, { frames, cache, reach });
  yield* reach(STAGES.limiter);
  core.curves.limit.set(limitCurve(MASTERING.limit)(out).curve);
  finished({ left: out.left, right: out.right, position: FIRST, frames })(core);
  yield* reach(STAGES.done);
  return { left: out.left, right: out.right, curves: core.curves };
});
