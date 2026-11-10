import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { WORKFLOW_GITHUB_GRANTS, grantPolicies } from "./credential-grants.ts";
import type { Claims } from "./github-oidc.ts";
import { grantKeys, isGranted, workflowFile, workflowGrant } from "./github-oidc.ts";

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

const BROKER_GRANTS = {
  ...grantPolicies({ accountId: "account", zoneId: "zone" }),
  workflows: WORKFLOW_GITHUB_GRANTS,
};

const UNLISTED = "not-listed";

const BOT_PERMISSION_NAMES = ["contents", "metadata", "pull_requests"];

const jobIn = ({
  repository,
  workflow,
}: Readonly<{ repository: string; workflow: string }>): typeof Claims.Type => ({
  ...PUSH,
  repository: `masseater/${repository}`,
  workflow_ref: `masseater/${repository}/.github/workflows/${workflow}@refs/heads/main`,
});

const isListedForNpm = (claims: typeof Claims.Type): boolean =>
  Arr.some(grantKeys(claims), (key) => Arr.contains(BROKER_GRANTS.npm, key));

test("the real tables grant masseater.dev with and without the github environment", () => {
  expect(isGranted(BROKER_GRANTS)(PUSH)).toBe(true);
  expect(isGranted(BROKER_GRANTS)(inEnvironment("github"))).toBe(true);
});

test("the real tables grant nothing to a repository they do not list", () => {
  const unlisted = jobIn({ repository: UNLISTED, workflow: "verify.yml" });
  expect(isGranted(BROKER_GRANTS)(unlisted)).toBe(false);
  expect(isGranted(BROKER_GRANTS)({ ...unlisted, environment: "github" })).toBe(false);
  expect(isGranted(BROKER_GRANTS)({ ...unlisted, environment: "npm" })).toBe(false);
});

test("the real npm list grants only the npm environment of masseater.dev", () => {
  const elsewhere = jobIn({ repository: UNLISTED, workflow: "publish.yml" });
  expect(isListedForNpm(PUSH)).toBe(false);
  expect(isListedForNpm(inEnvironment("npm"))).toBe(true);
  expect(isGranted(BROKER_GRANTS)(inEnvironment("npm"))).toBe(true);
  expect(isListedForNpm(elsewhere)).toBe(false);
  expect(isListedForNpm({ ...elsewhere, environment: "npm" })).toBe(false);
});

test("a bot workflow in an unlisted repository is granted for that repository alone", () => {
  const autofix = jobIn({ repository: UNLISTED, workflow: "autofix.yml" });
  expect(isGranted(BROKER_GRANTS)(autofix)).toBe(true);
  expect(workflowGrant(BROKER_GRANTS.workflows)(autofix)).toStrictEqual(
    Option.some({
      permissions: { contents: "write", pull_requests: "write", metadata: "read" },
      repositories: [UNLISTED],
    }),
  );
});

test("a workflow outside the workflow table in an unlisted repository is not granted", () => {
  const release = jobIn({ repository: UNLISTED, workflow: "release.yml" });
  const outsideWorkflows = {
    ...release,
    workflow_ref: `masseater/${UNLISTED}/scripts/autofix.yml@refs/heads/main`,
  };
  expect(workflowGrant(BROKER_GRANTS.workflows)(release)).toStrictEqual(Option.none());
  expect(isGranted(BROKER_GRANTS)(release)).toBe(false);
  expect(workflowGrant(BROKER_GRANTS.workflows)(outsideWorkflows)).toStrictEqual(Option.none());
  expect(isGranted(BROKER_GRANTS)(outsideWorkflows)).toBe(false);
});

test("every workflow grant carries only contents, pull request and metadata permissions", () => {
  const files = Rec.keys(BROKER_GRANTS.workflows);
  const grants = pipe(
    files,
    Arr.map((workflow) =>
      workflowGrant(BROKER_GRANTS.workflows)(jobIn({ repository: UNLISTED, workflow })),
    ),
    Arr.getSomes,
  );
  expect(Arr.isReadonlyArrayNonEmpty(files)).toBe(true);
  expect(grants).toHaveLength(files.length);
  expect(
    pipe(
      grants,
      Arr.flatMap(({ permissions }) => Rec.keys(permissions)),
      Arr.difference(BOT_PERMISSION_NAMES),
    ),
  ).toStrictEqual([]);
});
