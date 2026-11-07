import tscWasm from "@typescript/typescript-wasip1-wasm/lib/tsc.wasm?url";
import { wrap } from "comlink";
import type { Remote } from "comlink";
import { Effect } from "effect";
import type { Scope } from "effect";

import type { CheckerWorker } from "./checker.worker";
import { GENERATED_PATH } from "./editors";

const spawn = Effect.acquireRelease(
  Effect.sync(() => new Worker(new URL("checker.worker.ts", import.meta.url), { type: "module" })),
  (thread) =>
    Effect.sync(() => {
      thread.terminate();
    }),
).pipe(Effect.map((thread) => wrap<CheckerWorker>(thread)));

const prepare = (worker: Remote<CheckerWorker>, code: string): Effect.Effect<void> =>
  Effect.promise(() => worker.initialize(tscWasm)).pipe(
    Effect.andThen(Effect.promise(() => worker.updateFile({ path: GENERATED_PATH, code }))),
  );

const checkerThread = (code: string): Effect.Effect<Remote<CheckerWorker>, never, Scope.Scope> =>
  spawn.pipe(Effect.tap((worker) => prepare(worker, code)));

export { checkerThread };
