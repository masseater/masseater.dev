import { Effect, Schema } from "effect";

import { InvalidRecord } from "#/shared/api";

const invalid = ({ message }: Readonly<{ message: string }>): InvalidRecord =>
  InvalidRecord.make({ message });

export const decoded =
  <Codec extends Schema.Top & { readonly DecodingServices: never }>(schema: Codec) =>
  (input: unknown): Effect.Effect<Codec["Type"], InvalidRecord> =>
    Schema.decodeUnknownEffect(schema)(input).pipe(Effect.mapError(invalid));
