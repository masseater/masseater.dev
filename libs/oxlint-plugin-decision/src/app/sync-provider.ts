import { Array as Arr, Effect, Option, Predicate, String as Str, pipe } from "effect";
import { createSyncFn } from "synckit";
import type { Syncify } from "synckit";

import { messageOf, runOrElse } from "#/entities/decision/index.ts";
import type { DecideInput, DecideResult, DecisionProvider } from "#/entities/decision/index.ts";

const BACKSTOP_MS = 60_000;
const SYNCKIT_TIMEOUT = "Internal error: Atomics.wait() failed: timed-out";
const BUILT_EXTENSION = ".mjs";
const MODULE_EXTENSION = /\.[cm]?[jt]s$/u;

type Inputs = Arr.NonEmptyReadonlyArray<DecideInput>;

type Results = Arr.NonEmptyReadonlyArray<DecideResult>;

type Worker = (inputs: Inputs) => Promise<Results>;

/** @internal */
export interface SyncProviderSetup extends Pick<
  DecisionProvider,
  "name" | "requiredEnv" | "yesNo"
> {
  readonly worker: string;
}

const workers = new Map<string, Syncify<Worker>>();

const workerUrl = (worker: string): URL => {
  const extension = pipe(
    Str.match(MODULE_EXTENSION)(import.meta.url),
    Option.flatMap(Arr.head),
    Option.getOrElse(() => BUILT_EXTENSION),
  );
  return new URL(`${worker}${extension}`, import.meta.url);
};

const workerCall = (worker: string): Syncify<Worker> => {
  const existing = workers.get(worker);
  if (Predicate.isNotUndefined(existing)) {
    return existing;
  }
  const created = createSyncFn<Worker>(workerUrl(worker), { timeout: BACKSTOP_MS });
  workers.set(worker, created);
  return created;
};

const reasonOf = (error: unknown): string => {
  const message = messageOf(error);
  if (message === SYNCKIT_TIMEOUT) {
    return "timeout";
  }
  return `network: ${message}`;
};

const askWorker = (worker: string, inputs: Inputs): Results =>
  runOrElse(
    Effect.sync(() => workerCall(worker)(inputs)),
    (cause) =>
      pipe(
        inputs,
        Arr.map((): DecideResult => ({ ok: false, reason: reasonOf(cause) })),
      ),
  );

/** @internal */
export const syncProvider = ({ worker, ...provider }: SyncProviderSetup): DecisionProvider => ({
  ...provider,
  decide: (input) => Arr.headNonEmpty(askWorker(worker, [input])),
  decideAll: (inputs) =>
    Arr.match(inputs, { onEmpty: () => [], onNonEmpty: (some) => askWorker(worker, some) }),
});
