import { Option, Schema } from "effect";

const taggedError = Schema.TaggedError;

export class BadScore extends taggedError<BadScore, { readonly brand: unique symbol }>()(
  "BadScore",
  {
    part: Schema.String,
  },
) {}

export const scoreOf =
  <Decoder extends Schema.ConstraintDecoder<unknown>>(schema: Decoder) =>
  (part: string, json: unknown): Decoder["Type"] =>
    Option.getOrThrowWith(Schema.decodeUnknownOption(schema)(json), () => BadScore.make({ part }));
