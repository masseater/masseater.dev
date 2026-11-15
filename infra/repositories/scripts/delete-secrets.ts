#!/usr/bin/env node
import { deleteRepoSecret, listRepoSecrets } from "@distilled.cloud/github/actions";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { fail } from "@masseater.dev/github-workflow";
import { runMainWith } from "@masseater.dev/node-main";
import { Array as Arr, Console, Effect, Stream } from "effect";

import { OWNER } from "#github-oidc";

import { requestedNames, requestedRepositories } from "./requested-names.ts";

const BROKER_REPOSITORY = "masseater.dev";
const PAGE_SIZE = 100;

const deleteFrom = Effect.fn("deleteFrom")(function* deleteFrom(
  target: Readonly<{ repo: string; secrets: readonly string[] }>,
) {
  const present = yield* listRepoSecrets
    .items({ owner: OWNER, repo: target.repo, per_page: PAGE_SIZE })
    .pipe(Stream.runCollect, Effect.map(Arr.map(({ name }) => name)));
  const deletable = Arr.intersection(target.secrets, present);
  const absent = Arr.difference(target.secrets, present);
  yield* Effect.forEach(absent, (secret) => Console.log(`${secret} is not in ${target.repo}`), {
    discard: true,
  });
  yield* Effect.forEach(
    deletable,
    (secret) =>
      deleteRepoSecret({ owner: OWNER, repo: target.repo, secret_name: secret }).pipe(
        Effect.andThen(Console.log(`deleted ${secret} from ${target.repo}`)),
      ),
    { discard: true },
  );
});

const deleteSecrets = Effect.gen(function* deleteSecrets() {
  const secrets = yield* requestedNames("SECRETS");
  const repositories = yield* requestedRepositories("REPOSITORIES");
  if (Arr.contains(repositories, BROKER_REPOSITORY)) {
    return yield* fail(`${BROKER_REPOSITORY} holds the broker's own secrets`);
  }
  yield* Effect.forEach(repositories, (repo) => deleteFrom({ repo, secrets }), { discard: true });
  return Arr.length(repositories);
});

runMainWith({ serviceName: "delete-secrets", services: CredentialsFromEnv })(deleteSecrets);
