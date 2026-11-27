import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";

import { sweep } from "#/features/sweep-entries/index.ts";
import { CacheStore, cacheStoreOf } from "#/shared/lib/cache-store.ts";
import type { CacheBindings } from "#/shared/lib/cache-store.ts";

import { routed } from "./routes.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const worker: ExportedHandler<CacheBindings> = {
  fetch: (request, env) => {
    const store = cacheStoreOf(env);
    return runLogged(routed(request).pipe(Effect.provideService(CacheStore, store)));
  },
  scheduled: (_controller, env) => {
    const store = cacheStoreOf(env);
    return runLogged(sweep.pipe(Effect.provideService(CacheStore, store)));
  },
};

export default worker;
