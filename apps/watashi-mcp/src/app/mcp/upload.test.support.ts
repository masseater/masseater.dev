import { makeD1 } from "@masseater.dev/d1-test";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Layer } from "effect";

import type { Gate } from "#/entities/api-token/index.server.ts";
import { ConversationObjects } from "#/entities/conversation/index.server.ts";
import type { ObjectStore } from "#/entities/conversation/index.server.ts";
import { Embedder } from "#/entities/trait/index.server.ts";
import { UploadMetrics } from "#/features/store-conversations/index.server.ts";
import type { MetricsSink } from "#/features/store-conversations/index.server.ts";
import { services } from "#/shared/api/index.server.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

import type { WatashiServices } from "./bindings.server.ts";

const testD1 = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: ["conversation_chunk", "conversation_session", "api_token"],
});

export const { closeDatabase, resetDatabase } = testD1;

export const objects = new Map<string, Uint8Array>();

export const refusedPuts = new Set<string>();

const store: ObjectStore = {
  get: () => Promise.reject(new Error("the upload API does not read objects")),
  put: (key, body) => {
    if (refusedPuts.has(key)) {
      return Promise.reject(new Error("R2 is down"));
    }
    objects.set(key, body);
    return Promise.resolve();
  },
  delete: (key) => {
    objects.delete(key);
    return Promise.resolve();
  },
};

export const points: unknown[] = [];

const metrics: MetricsSink = {
  writeDataPoint: (point) => {
    points.push(point);
  },
};

const unusedEmbedder = (): Promise<never> =>
  Promise.reject(new Error("the upload API does not embed"));

const drizzled = testD1.database.pipe(Effect.map(databaseOf));

const testLayer: Layer.Layer<WatashiServices> = Layer.mergeAll(
  services,
  Layer.effect(Database, drizzled),
  Layer.succeed(ConversationObjects, store),
  Layer.succeed(UploadMetrics, metrics),
  Layer.succeed(Embedder, unusedEmbedder),
);

const ownerRefused = (): Promise<Response> =>
  Promise.resolve(new Response("owner login is not part of these tests", { status: 401 }));

const run = runner(testLayer);

/** @internal */
export const gate: Gate<WatashiServices> = { guard: () => ownerRefused, run };

/** @internal */
export const provided = <Success, Failure>(
  effect: Effect.Effect<Success, Failure, WatashiServices>,
): Effect.Effect<Success> => Effect.promise(() => run(effect));

export const sql = (statement: string): Effect.Effect<unknown> =>
  testD1.database.pipe(
    Effect.flatMap((database) => Effect.promise(() => database.prepare(statement).run())),
  );
