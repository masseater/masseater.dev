import { Layer } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";

import { ConversationObjects } from "#/entities/conversation/index.server.ts";
import type { ObjectStore } from "#/entities/conversation/index.server.ts";
import { Embedder, workersEmbedder } from "#/entities/trait/index.server.ts";
import { UploadMetrics } from "#/features/store-conversations/index.server.ts";
import type { MetricsSink } from "#/features/store-conversations/index.server.ts";
import { runToolIn, services } from "#/shared/api/index.server.ts";
import type { ToolRun } from "#/shared/api/index.server.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

export type WatashiBindings = Readonly<{
  DB: D1Database;
  AI: Ai;
  BETTER_AUTH_SECRET: string;
  CONVERSATIONS: ObjectStore;
  CONVERSATION_UPLOADS: MetricsSink;
}>;

/** @internal */
export type WatashiServices =
  | Database
  | Embedder
  | ConversationObjects
  | UploadMetrics
  | Digest.Digest
  | SecureRandom.SecureRandom;

/** @internal */
export const watashiLayer = (bindings: WatashiBindings): Layer.Layer<WatashiServices> =>
  Layer.mergeAll(
    services,
    Layer.succeed(Database, databaseOf(bindings.DB)),
    Layer.succeed(Embedder, workersEmbedder(bindings.AI)),
    Layer.succeed(ConversationObjects, bindings.CONVERSATIONS),
    Layer.succeed(UploadMetrics, bindings.CONVERSATION_UPLOADS),
  );

/** @internal */
export const toolRunOf = (bindings: WatashiBindings): ToolRun<WatashiServices> =>
  runToolIn(watashiLayer(bindings));
