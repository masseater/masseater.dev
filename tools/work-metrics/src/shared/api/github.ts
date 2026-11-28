import { Credentials, DEFAULT_API_BASE_URL } from "@distilled.cloud/github/Credentials";
import { Config, Effect, Layer, Redacted } from "effect";

const USER_AGENT = "work-metrics";

export const githubToken = Config.String("GITHUB_TOKEN").pipe(
  Config.orElse(() => Config.String("GH_TOKEN")),
  Config.withDefault("session-proxy"),
);

const fromEnv = Effect.gen(function* fromEnv() {
  const value = yield* githubToken;
  return { token: Redacted.make(value), apiBaseUrl: DEFAULT_API_BASE_URL, userAgent: USER_AGENT };
}).pipe(Effect.orDie);

export const githubCredentials = Layer.succeed(Credentials, fromEnv);
