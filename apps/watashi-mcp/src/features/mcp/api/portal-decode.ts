import { Effect, Schema } from "effect";

import { InvalidRecord } from "#/features/mcp/model/invalid-record";

const invalid = ({ message }: Readonly<{ message: string }>): InvalidRecord =>
  InvalidRecord.make({ message });

const decoded =
  <Codec extends Schema.Top & { readonly DecodingServices: never }>(schema: Codec) =>
  (input: unknown): Effect.Effect<Codec["Type"], InvalidRecord> =>
    Schema.decodeUnknownEffect(schema)(input).pipe(Effect.mapError(invalid));

export { decoded };
