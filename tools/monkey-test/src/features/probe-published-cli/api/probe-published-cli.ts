import { Array as Arr, Effect, pipe } from "effect";

import { listPublishedBins } from "./list-published-bins.ts";
import { probeInstalledPackage } from "./probe-package.ts";

const CONCURRENCY = 3;

const probeAll = Effect.fn("monkey.cli")(function* probeAll() {
  const published = yield* listPublishedBins();
  const found = yield* Effect.forEach(
    published,
    (one) => Effect.scoped(probeInstalledPackage(one)),
    { concurrency: CONCURRENCY },
  );
  return pipe(found, Arr.flatten);
});

/** @internal */
export const probePublishedCli = probeAll;
