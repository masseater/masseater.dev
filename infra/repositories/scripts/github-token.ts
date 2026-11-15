#!/usr/bin/env node
import { Credentials } from "@distilled.cloud/github/Credentials";
import { fail, mask, setEnv } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Option, Redacted, pipe } from "effect";

import { brokerIdToken, issued } from "./broker-client.ts";
import { installedRepositories } from "./installed-repositories.ts";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "masseater.dev";
const MISSING_FROM_BROKER =
  "The credential broker returned no GitHub token: check https://credentials.masseater.dev/github-app and the broker logs";

const maskPrivateNames = Effect.fn("maskPrivateNames")(function* maskPrivateNames(token: string) {
  const credentials = Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: GITHUB_API,
    userAgent: USER_AGENT,
  });
  const repositories = yield* installedRepositories.pipe(
    Effect.provideService(Credentials, credentials),
  );
  const hidden = pipe(
    repositories,
    Arr.filter((repository) => repository.private && !repository.archived),
  );
  yield* Effect.forEach(hidden, ({ name }) => mask(name), { discard: true });
});

const brokerGitHubToken = Effect.gen(function* brokerGitHubToken() {
  const oidc = yield* brokerIdToken;
  yield* mask(oidc);
  const token = yield* issued({ only: "github", field: "githubToken", oidc }).pipe(
    Effect.flatMap(
      Option.match({ onNone: () => fail(MISSING_FROM_BROKER), onSome: Effect.succeed }),
    ),
  );
  yield* mask(token);
  yield* maskPrivateNames(token);
  yield* setEnv({ GITHUB_TOKEN: token });
});

runMain("broker-github-token")(brokerGitHubToken);
