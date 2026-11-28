import { Array as Arr, Config, Effect, Option, Record as Rec, pipe } from "effect";

const PASSED_THROUGH = [
  "PATH",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "https_proxy",
  "http_proxy",
  "no_proxy",
  "SSL_CERT_FILE",
  "NODE_EXTRA_CA_CERTS",
] as const;

const optionalValue = (
  name: string,
): Effect.Effect<readonly [string, string][], Config.ConfigError> =>
  pipe(
    Config.option(Config.String(name)),
    Effect.map((value) =>
      pipe(
        value,
        Option.map((found): [string, string] => [name, found]),
        Option.toArray,
      ),
    ),
  );

export const passedEnv: Effect.Effect<Readonly<Record<string, string>>, Config.ConfigError> = pipe(
  Effect.forEach(PASSED_THROUGH, optionalValue, { concurrency: 1 }),
  Effect.map((pairs) => pipe(Arr.flatten(pairs), Rec.fromEntries)),
);
