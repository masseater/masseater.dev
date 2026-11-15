import { Effect, Schema } from "effect";

export const manifestText = (fields: unknown): Effect.Effect<string> =>
  Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(fields).pipe(Effect.orDie);
