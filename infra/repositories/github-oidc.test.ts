import { Array as Arr, Option, Record as Rec } from "effect";
import { expect, test } from "vite-plus/test";

import type { Claims } from "./github-oidc.ts";
import { grantKeys, workflowFile } from "./github-oidc.ts";

const PUSH: typeof Claims.Type = {
  repository_owner: "masseater",
  repository_owner_id: "62135405",
  repository: "masseater/masseater.dev",
  event_name: "push",
  ref: "refs/heads/main",
  run_id: "1",
  run_attempt: "1",
  workflow_ref: "masseater/masseater.dev/.github/workflows/verify.yml@refs/heads/main",
};

const inEnvironment = (environment: string): typeof Claims.Type => ({ ...PUSH, environment });

const GRANTS: Readonly<Record<string, string>> = {
  "masseater.dev": "deploy",
  "masseater.dev/github": "github",
};

const grantFor = (claims: typeof Claims.Type): Option.Option<string> =>
  Arr.findFirst(grantKeys(claims), (key) => Rec.get(GRANTS, key));

test("a job without an environment is looked up by repository", () => {
  expect(grantKeys(PUSH)).toStrictEqual(["masseater.dev"]);
  expect(grantFor(PUSH)).toStrictEqual(Option.some("deploy"));
});

test("a job in an environment prefers the environment grant", () => {
  expect(grantFor(inEnvironment("github"))).toStrictEqual(Option.some("github"));
});

test("an environment without its own grant falls back to the repository", () => {
  expect(grantKeys(inEnvironment("production"))).toStrictEqual([
    "masseater.dev/production",
    "masseater.dev",
  ]);
  expect(grantFor(inEnvironment("production"))).toStrictEqual(Option.some("deploy"));
});

test("the workflow file is read from the workflow ref", () => {
  expect(workflowFile(PUSH)).toStrictEqual(Option.some("verify.yml"));
  expect(
    workflowFile({
      ...PUSH,
      workflow_ref: "masseater/masseater.dev/.github/workflows/autofix.yml@refs/heads/main",
    }),
  ).toStrictEqual(Option.some("autofix.yml"));
  expect(workflowFile({ ...PUSH, workflow_ref: "malformed" })).toStrictEqual(Option.none());
});
