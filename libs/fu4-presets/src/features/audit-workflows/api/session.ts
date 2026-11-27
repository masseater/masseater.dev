import { Array as Arr, Config, Deferred, Effect, Option, Redacted, pipe } from "effect";

import type { GitHubClient } from "#/features/audit-workflows/model/github.ts";

import { startClient } from "./platform.ts";

const SEPARATOR = "\u0000";

const TOKEN = Config.Redacted("ZIZMOR_GITHUB_TOKEN").pipe(
  Config.orElse(() => Config.Redacted("GH_TOKEN")),
  Config.orElse(() => Config.Redacted("GITHUB_TOKEN")),
  Config.option,
);

const clients = new Map<string, Deferred.Deferred<GitHubClient>>();

const fresh = (key: string, start: Effect.Effect<GitHubClient>): Effect.Effect<GitHubClient> => {
  const deferred = Deferred.makeUnsafe<GitHubClient>();
  clients.set(key, deferred);
  return Effect.tap(start, (client) => Deferred.succeed(deferred, client));
};

const clientFor =
  (host: string, root: string) =>
  (token: Redacted.Redacted): Effect.Effect<GitHubClient> => {
    const key = pipe([root, host, Redacted.value(token)], Arr.join(SEPARATOR));
    return Option.match(Option.fromNullishOr(clients.get(key)), {
      onSome: Deferred.await,
      onNone: () => fresh(key, startClient({ host, root, token })),
    });
  };

export const githubFor =
  (host: string) =>
  (root: string): Effect.Effect<Option.Option<GitHubClient>> =>
    TOKEN.pipe(
      Effect.orElseSucceed(Option.none<Redacted.Redacted>),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeedNone,
          onSome: (token) => token.pipe(clientFor(host, root), Effect.asSome),
        }),
      ),
    );
