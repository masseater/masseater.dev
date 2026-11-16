import { Effect, Schema } from "effect";

import { SongSchema } from "#/entities/song/index.ts";

const DIALECT = "https://json-schema.org/draft/2020-12/schema";
const INDENT = 2;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown, { space: INDENT }));

export const songJsonSchema = Effect.suspend(() => {
  const document = Schema.toJsonSchemaDocument(SongSchema);
  return encodeJson({ $schema: DIALECT, ...document.schema, $defs: document.definitions });
}).pipe(Effect.map((json) => `${json}\n`));
