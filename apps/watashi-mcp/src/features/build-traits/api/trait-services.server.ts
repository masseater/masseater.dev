import { JAPAN_GENERATION, JAPAN_OBJECT } from "@masseater.dev/cloudflare-account/japan";
import { run, runner } from "@r_masseater/workers-tracing/effect";
import type { Run } from "@r_masseater/workers-tracing/effect";
import { Effect, Layer, Logger } from "effect";

import { ConversationObjects } from "#/entities/conversation/index.server.ts";
import type { ObjectStore } from "#/entities/conversation/index.server.ts";
import { Embedder, workersEmbedder } from "#/entities/trait/index.server.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

export type TraitBindings = Readonly<{ DB: D1Database; AI: Ai; CONVERSATIONS: ObjectStore }>;

export type TraitServices = Database | Embedder | ConversationObjects;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const traitServices = (bindings: TraitBindings): Layer.Layer<TraitServices> => {
  const database = databaseOf(bindings.DB);
  const embed = workersEmbedder(bindings.AI);
  return Layer.mergeAll(
    Layer.succeed(Database, database),
    Layer.succeed(Embedder, embed),
    Layer.succeed(ConversationObjects, bindings.CONVERSATIONS),
  );
};

export const traitRunner = (bindings: TraitBindings): Run<TraitServices> =>
  runner(Layer.mergeAll(logger, traitServices(bindings)));

export const awaited = (call: () => PromiseLike<unknown>): Promise<void> =>
  run(Effect.promise(call).pipe(Effect.asVoid));

export const ownerOf = <Stub>(
  namespace: Readonly<{ getByName: (name: string, options: typeof JAPAN_OBJECT) => Stub }>,
): Stub => namespace.getByName(`owner${JAPAN_GENERATION}`, JAPAN_OBJECT);
