import { Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";
import { DEFAULT_LENGTH_SECONDS, FORMATS } from "#/shared/config/index.ts";

const SECONDS_PER_MINUTE = 60;
const UNIT = /[sm]$/u;
const DEFAULT_VOICE = 8;

const Duration = Schema.String.check(Schema.isPattern(/^\d+(?:\.\d+)?[sm]$/u));

export const secondsOf = (duration: string): number => {
  const amount = Number(Str.replace(UNIT, "")(duration));
  if (Str.endsWith("m")(duration)) {
    return amount * SECONDS_PER_MINUTE;
  }
  return amount;
};

const Formats = Schema.Array(Schema.Literals(FORMATS)).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([...FORMATS])),
);

const Lengths = Schema.Struct({
  vertical: Schema.optionalKey(Duration),
  horizontal: Schema.optionalKey(Duration),
}).pipe(Schema.withDecodingDefaultKey(Effect.succeed({})));
const Voice = Schema.Union([Schema.Finite, Schema.Literal("none")]).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_VOICE)),
);

const Readings = Schema.Record(Schema.String, Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed({})),
);

export const FrontmatterSchema = Schema.Struct({
  title: Schema.String,
  formats: Formats,
  length: Lengths,
  voice: Voice,
  readings: Readings,
  bgm: Schema.optionalKey(Schema.Struct({ url: Schema.String, credit: Schema.String })),
});

export type Frontmatter = typeof FrontmatterSchema.Type;

export const decodeFrontmatter: (input: unknown) => Effect.Effect<Frontmatter, Schema.SchemaError> =
  Schema.decodeUnknownEffect(FrontmatterSchema);

const lengthFor = (frontmatter: Frontmatter, format: Format): number =>
  pipe(
    Option.fromUndefinedOr(frontmatter.length[format]),
    Option.match({ onNone: () => DEFAULT_LENGTH_SECONDS[format], onSome: secondsOf }),
  );

export const lengthOf = (frontmatter: Frontmatter): Readonly<Record<Format, number>> => ({
  vertical: lengthFor(frontmatter, "vertical"),
  horizontal: lengthFor(frontmatter, "horizontal"),
});
