import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import { EmbeddingFailed } from "./embedding-failed.ts";

const VectorSchema = Schema.Array(Schema.Finite);

/** @internal */
const WorkerSettings = Schema.Struct({ modelDirectory: Schema.Option(Schema.String) });

/** @internal */
class EmbedderRpcs extends RpcGroup.make(
  Rpc.make("Device", { success: Schema.String }),
  Rpc.make("EmbedQuery", {
    payload: { query: Schema.String },
    success: VectorSchema,
    error: EmbeddingFailed,
  }),
  Rpc.make("EmbedDocuments", {
    payload: { texts: Schema.Array(Schema.String) },
    success: Schema.Array(VectorSchema),
    error: EmbeddingFailed,
  }),
  Rpc.make("EmbedImages", {
    payload: { pngs: Schema.Array(Schema.Uint8Array) },
    success: Schema.Array(VectorSchema),
    error: EmbeddingFailed,
  }),
) {}

export { EmbedderRpcs, WorkerSettings };
