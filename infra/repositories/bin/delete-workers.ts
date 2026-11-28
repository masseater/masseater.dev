#!/usr/bin/env node
import { deleteScript, listScripts } from "@distilled.cloud/cloudflare/workers";
import { runMainWith } from "@r_masseater/node-main";
import { Array as Arr, Config, Console, Effect, Stream } from "effect";

import { cloudflare } from "./lib/cloudflare.ts";
import { requestedNames } from "./lib/requested-names.ts";

const deleteWorkers = Effect.gen(function* deleteWorkers() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const names = yield* requestedNames("WORKERS");
  const present = yield* listScripts
    .items({ accountId })
    .pipe(Stream.runCollect, Effect.map(Arr.map(({ id }) => id)));
  yield* Effect.forEach(
    Arr.difference(names, present),
    (name) => Console.log(`${name} does not exist`),
    { concurrency: 1, discard: true },
  );
  yield* Effect.forEach(
    Arr.intersection(names, present),
    (name) =>
      deleteScript({ accountId, scriptName: name }).pipe(
        Effect.andThen(Console.log(`deleted ${name}`)),
      ),
    { concurrency: 1, discard: true },
  );
  const remaining = yield* listScripts
    .items({ accountId })
    .pipe(Stream.runCollect, Effect.map(Arr.map(({ id }) => id)));
  yield* Console.log(`still present: ${Arr.join(Arr.intersection(names, remaining), ",")}`);
});

runMainWith({ serviceName: "delete-workers", services: cloudflare })(deleteWorkers);
