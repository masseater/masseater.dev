import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Layer, Logger } from "effect";
import { FetchHttpClient } from "effect/http";

import type { AppStoreEnv } from "./app-store.ts";
import { fireRoutine, registerRoutine } from "./claude-routine.ts";
import type { FireOutcome } from "./claude-routine.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const services = Layer.mergeAll(logger, FetchHttpClient.layer);

class ClaudeRoutine extends WorkerEntrypoint<AppStoreEnv> {
  public register(routine: unknown): Promise<boolean> {
    return runner(services)(registerRoutine({ env: this.env, routine }));
  }

  public fire(): Promise<FireOutcome> {
    return runner(services)(fireRoutine(this.env));
  }
}

export { ClaudeRoutine };
