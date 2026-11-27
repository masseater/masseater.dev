import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";

import { DocumentsDb, documentsDbOf } from "#/entities/document/index.ts";
import type { AppEnv } from "#/shared/config/index.ts";

import { routed } from "./routes.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const worker: ExportedHandler<AppEnv> = {
  fetch: (request, env) => {
    const db = documentsDbOf(env.DB);
    return runLogged(routed(request).pipe(Effect.provideService(DocumentsDb, db)));
  },
};

export default worker;
