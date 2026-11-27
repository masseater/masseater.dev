#!/usr/bin/env node
import { getRepoPublicKey } from "@distilled.cloud/github/actions";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { runMainWith } from "@r_masseater/node-main";
import { Console, Effect } from "effect";

import { OWNER } from "#/entities/credential/index.ts";

import { requestedRepositories } from "./lib/requested-names.ts";

const printKey = Effect.fn("printKey")(function* printKey(repo: string) {
  const { key_id: keyId, key } = yield* getRepoPublicKey({ owner: OWNER, repo });
  yield* Console.log(`${repo}:${keyId}:${key}`);
});

const secretKeys = Effect.gen(function* secretKeys() {
  const repositories = yield* requestedRepositories("REPOSITORIES");
  yield* Effect.forEach(repositories, printKey, { concurrency: 1, discard: true });
});

runMainWith({ serviceName: "secret-keys", services: CredentialsFromEnv })(secretKeys);
