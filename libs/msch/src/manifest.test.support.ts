import { Effect, Schema } from "effect";

const manifestText = (fields: unknown): Effect.Effect<string> =>
  Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(fields).pipe(Effect.orDie);

export { manifestText };
