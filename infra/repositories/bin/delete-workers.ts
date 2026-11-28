#!/usr/bin/env node
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import { deleteScript, listScripts } from "@distilled.cloud/cloudflare/workers";
import { runMainWith } from "@r_masseater/node-main";
import { Array as Arr, Config, Console, Effect, Layer, Stream } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { requestedNames } from "./lib/requested-names.ts";

const cloudflare = Layer.unwrap(
  Config.Redacted("CLOUDFLARE_API_TOKEN").pipe(
    Effect.map((apiToken) => Layer.mergeAll(fromApiToken({ apiToken }), fetchHttpClient)),
  ),
);

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
