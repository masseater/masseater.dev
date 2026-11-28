import { Config, Effect, Option, Redacted, Schema, pipe } from "effect";

const Tokens = Schema.fromJsonString(Schema.Record(Schema.String, Schema.String));

const decodeTokens = Schema.decodeEffect(Tokens);

const readTokens = Effect.fn("monkey.tokens")(function* readTokens() {
  const raw = yield* Config.option(Config.Redacted("MONKEY_ACCESS_TOKENS"));
  return yield* pipe(
    raw,
    Option.match({
      onNone: () => Effect.succeed<Readonly<Record<string, string>>>({}),
      onSome: (text) => text.pipe(Redacted.value, decodeTokens),
    }),
  );
});

/** @internal */
export const readAccessTokens = readTokens;
