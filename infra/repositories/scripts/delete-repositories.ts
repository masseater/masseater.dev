#!/usr/bin/env node
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { Delete } from "@distilled.cloud/github/repos";
import { runMainWith } from "@masseater.dev/node-main";
import { Console, Effect } from "effect";

import { OWNER } from "#github-oidc";

import { requestedRepositories } from "./requested-names.ts";

const deleteRepositories = Effect.gen(function* deleteRepositories() {
  const repositories = yield* requestedRepositories("REPOSITORIES");
  yield* Effect.forEach(
    repositories,
    (repo) => Delete({ owner: OWNER, repo }).pipe(Effect.andThen(Console.log(`deleted ${repo}`))),
    { discard: true },
  );
});

runMainWith({ serviceName: "delete-repositories", services: CredentialsFromEnv })(
  deleteRepositories,
);
