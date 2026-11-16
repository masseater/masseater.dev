import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Layer, Logger } from "effect";
import { FetchHttpClient } from "effect/http";

import {
  fireRoutine,
  registerRoutine,
} from "#/features/run-claude-routine/model/claude-routine.ts";
import type {
  ClaudeRoutineRpc,
  FireOutcome,
} from "#/features/run-claude-routine/model/claude-routine.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const services = Layer.mergeAll(logger, FetchHttpClient.layer);

export class ClaudeRoutine extends WorkerEntrypoint<AppStoreEnv> implements ClaudeRoutineRpc {
  public register(routine: unknown): Promise<boolean> {
    return runner(services)(registerRoutine({ env: this.env, routine }));
  }

  public fire(): Promise<FireOutcome> {
    return runner(services)(fireRoutine(this.env));
  }
}
