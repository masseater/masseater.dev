import { inMemoryState } from "alchemy/State";
import type { CreatedResourceState } from "alchemy/State";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { ownerStack } from "./index.ts";

const created = (fqn: string): CreatedResourceState => ({
  resourceType: "Cloudflare.Access.Policy",
  namespace: Option.getOrUndefined(Option.none()),
  fqn,
  logicalId: fqn,
  instanceId: fqn,
  providerVersion: 0,
  status: "created",
  downstream: [],
  bindings: [],
  props: {},
  attr: {},
});

const prodStage = (
  fqns: readonly string[],
): Record<string, Record<string, CreatedResourceState>> => ({
  prod: pipe(
    fqns,
    Arr.map((fqn) => [fqn, created(fqn)] as const),
    Rec.fromEntries,
  ),
});

const resolve = (stacks: Readonly<Record<string, readonly string[]>>): Promise<unknown> => {
  const state = inMemoryState(pipe(stacks, Rec.map(prodStage)));
  return Effect.runPromise(Effect.provide(ownerStack, state));
};

test("OwnerPolicy を prod に持つスタックを state から見つける", () =>
  expect(resolve({ site: ["Worker"], holder: ["OwnerPolicy"] })).resolves.toStrictEqual({
    stack: "holder",
    stage: "prod",
  }));

test("OwnerPolicy を持つスタックが無ければ止まる", () =>
  expect(resolve({ site: ["Worker"] })).rejects.toThrow("No stack holds OwnerPolicy"));

test("OwnerPolicy を持つスタックが 2 つあれば止まる", () =>
  expect(resolve({ first: ["OwnerPolicy"], second: ["OwnerPolicy"] })).rejects.toThrow(
    "2 stacks hold OwnerPolicy",
  ));
