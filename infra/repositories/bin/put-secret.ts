#!/usr/bin/env node
import { createOrUpdateRepoSecret } from "@distilled.cloud/github/actions";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { fail } from "@masseater.dev/github-workflow";
import { runMainWith } from "@masseater.dev/node-main";
import { Array as Arr, Config, Console, Effect, Schema, String as Str, pipe } from "effect";

import { OWNER } from "#/entities/credential/index.ts";

import { requestedNames } from "./lib/requested-names.ts";

const INVALID = "SEALED holds an entry that is not repo:key_id:base64 from the secret-keys task";

const Sealed = Schema.Tuple([
  Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._-]+$/u)),
  Schema.String.check(Schema.isPattern(/^[0-9]+$/u)),
  Schema.String.check(Schema.isPattern(/^[A-Za-z0-9+/=]+$/u)),
]);

const decodeSealed = Schema.decodeUnknownEffect(Sealed);

const parsed = Effect.fn("parsed")(function* parsed(entry: string) {
  return yield* decodeSealed(Str.split(":")(entry)).pipe(Effect.catch(() => fail(INVALID)));
});

const putOne = Effect.fn("putOne")(function* putOne(
  secret: string,
  [repo, keyId, value]: typeof Sealed.Type,
) {
  yield* createOrUpdateRepoSecret({
    owner: OWNER,
    repo,
    secret_name: secret,
    encrypted_value: value,
    key_id: keyId,
  });
  yield* Console.log(`set ${secret} in ${repo}`);
});

const putSecret = Effect.gen(function* putSecret() {
  const [secret] = yield* requestedNames("SECRET");
  const raw = yield* Config.String("SEALED");
  const entries = yield* Effect.forEach(
    pipe(Str.split(",")(raw), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty)),
    parsed,
    { concurrency: 1 },
  );
  yield* Effect.forEach(entries, (entry) => putOne(secret, entry), {
    concurrency: 1,
    discard: true,
  });
});

runMainWith({ serviceName: "put-secret", services: CredentialsFromEnv })(putSecret);
