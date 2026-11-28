#!/usr/bin/env node
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { getRef, updateRef } from "@distilled.cloud/github/git";
import { getRepoRulesets, updateRepoRuleset } from "@distilled.cloud/github/repos";
import { runMainWith } from "@r_masseater/node-main";
import { Array as Arr, Config, Console, Effect, Option, Stream, String as Str, pipe } from "effect";

import { OWNER } from "#/entities/credential/index.ts";

const REPOSITORY = "masseater.dev";
const RULESET = "protect default branch";

type Move = Readonly<{ ref: string; from: string; to: string }>;

const decodeMove = (token: string): Move => {
  const [ref, from, to] = Str.split(":")(token);
  return { ref, from: from ?? "", to: to ?? "" };
};

const decodePlan = (encoded: string): readonly Move[] => {
  const tokens = Str.split(",")(encoded);
  return pipe(tokens, Arr.filter(Str.isNonEmpty), Arr.map(decodeMove));
};

const enforce = Effect.fn("enforce")(function* enforce(
  rulesetId: number,
  enforcement: "active" | "disabled",
) {
  yield* updateRepoRuleset({ owner: OWNER, repo: REPOSITORY, ruleset_id: rulesetId, enforcement });
  yield* Console.log(`ruleset ${enforcement}`);
});

const move = Effect.fn("move")(function* move({ ref, from, to }: Move) {
  const path = Str.replace("refs/", "")(ref);
  const current = yield* getRef({ owner: OWNER, repo: REPOSITORY, ref: path });
  if (current.object.sha !== from) {
    return yield* Console.log(`skipped ${ref}`);
  }
  yield* updateRef({ owner: OWNER, repo: REPOSITORY, ref: path, sha: to, force: true });
  return yield* Console.log(`moved ${ref}`);
});

const rulesetId = Effect.gen(function* rulesetId() {
  const rulesets = yield* getRepoRulesets
    .items({ owner: OWNER, repo: REPOSITORY })
    .pipe(Stream.runCollect);
  const found = Arr.findFirst(rulesets, ({ name }) => name === RULESET);
  return yield* Option.match(found, {
    onNone: () => Effect.die(`${RULESET} does not exist`),
    onSome: ({ id }) => Effect.succeed(id),
  });
});

const rewriteHistory = Effect.gen(function* rewriteHistory() {
  const encoded = yield* Config.String("PLAN");
  const id = yield* rulesetId;
  yield* enforce(id, "disabled");
  const restore = Effect.orDie(enforce(id, "active"));
  const moves = Effect.forEach(decodePlan(encoded), move, { concurrency: 1, discard: true });
  yield* Effect.ensuring(moves, restore);
});

runMainWith({ serviceName: "rewrite-history", services: CredentialsFromEnv })(rewriteHistory);
