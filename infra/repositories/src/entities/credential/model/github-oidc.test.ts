import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { WORKFLOW_GITHUB_GRANTS, grantPolicies } from "./credential-grants.ts";
import type { Claims } from "./github-oidc.ts";
import {
  grantKeys,
  isGranted,
  sourceWorkflows,
  workflowFile,
  workflowGrant,
} from "./github-oidc.ts";

const PUSH: typeof Claims.Type = {
  repository_owner: "masseater",
  repository_owner_id: "62135405",
  repository: "masseater/masseater.dev",
  repository_id: "1411948414",
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
  expect(grantKeys(PUSH)).toStrictEqual(["masseater.dev", "1411948414"]);
  expect(grantFor(PUSH)).toStrictEqual(Option.some("deploy"));
});

test("a job in an environment prefers the environment grant", () => {
  expect(grantFor(inEnvironment("github"))).toStrictEqual(Option.some("github"));
});

test("an environment without its own grant falls back to the repository", () => {
  expect(grantKeys(inEnvironment("production"))).toStrictEqual([
    "masseater.dev/production",
    "masseater.dev",
    "1411948414/production",
    "1411948414",
  ]);
  expect(grantFor(inEnvironment("production"))).toStrictEqual(Option.some("deploy"));
});

const ID_GRANTS: Readonly<Record<string, string>> = { "42": "access" };

test("a repository granted by its id is found without its name in the grants", () => {
  const unnamed = { ...PUSH, repository: "masseater/unnamed", repository_id: "42" };
  expect(Arr.findFirst(grantKeys(unnamed), (key) => Rec.get(ID_GRANTS, key))).toStrictEqual(
    Option.some("access"),
  );
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

const isListedForAtproto = (claims: typeof Claims.Type): boolean =>
  Arr.some(grantKeys(claims), (key) => Arr.contains(BROKER_GRANTS.atproto, key));

test("the real atproto list grants only the bootstrap environment of masseater.dev", () => {
  const elsewhere = jobIn({ repository: UNLISTED, workflow: "deploy.yml" });
  expect(isListedForAtproto(PUSH)).toBe(false);
  expect(isListedForAtproto(inEnvironment("production"))).toBe(false);
  expect(isListedForAtproto(inEnvironment("bootstrap"))).toBe(true);
  expect(isListedForAtproto({ ...elsewhere, environment: "bootstrap" })).toBe(false);
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

test("the merge queue may also update workflow files when it merges main into a pull request", () => {
  const queue = jobIn({ repository: UNLISTED, workflow: "update-branches.yml" });
  expect(workflowGrant(BROKER_GRANTS.workflows)(queue)).toStrictEqual(
    Option.some({
      permissions: {
        contents: "write",
        pull_requests: "write",
        metadata: "read",
        workflows: "write",
      },
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

test("the publish workflow grant can only tag, including commits that change workflows", () => {
  const publish = jobIn({ repository: UNLISTED, workflow: "publish.yml" });
  expect(workflowGrant(BROKER_GRANTS.workflows)(publish)).toStrictEqual(
    Option.some({
      permissions: { contents: "write", workflows: "write", metadata: "read" },
      repositories: [UNLISTED],
    }),
  );
});

test("every bot workflow grant except the merge queue and publish carries only contents, pull request and metadata permissions", () => {
  const files = pipe(
    Rec.keys(BROKER_GRANTS.workflows),
    Arr.filter((workflow) => workflow !== "update-branches.yml" && workflow !== "publish.yml"),
  );
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

const grantsIn = (
  claims: typeof Claims.Type,
  isSource: (repository: string) => Effect.Effect<boolean>,
): Effect.Effect<typeof BROKER_GRANTS> =>
  sourceWorkflows({ workflows: BROKER_GRANTS.workflows, isSource })(claims).pipe(
    Effect.map((workflows) => ({ ...BROKER_GRANTS, workflows })),
  );

const asked = (answer: boolean) => (): Effect.Effect<boolean> => Effect.succeed(answer);

const unasked = (repository: string): Effect.Effect<boolean> =>
  Effect.die(`${repository} must not be looked up`);

const AUTOFIX = jobIn({ repository: UNLISTED, workflow: "autofix.yml" });

test("a bot workflow in a fork of someone else's repository gets no workflow grant and is not granted", () =>
  Effect.runPromise(
    Effect.gen(function* fork() {
      const grants = yield* grantsIn(AUTOFIX, asked(false));
      expect(workflowGrant(grants.workflows)(AUTOFIX)).toStrictEqual(Option.none());
      expect(isGranted(grants)(AUTOFIX)).toBe(false);
    }),
  ));

test("a bot workflow in the owner's own repository keeps its workflow grant", () =>
  Effect.runPromise(
    Effect.gen(function* source() {
      const grants = yield* grantsIn(AUTOFIX, (repository) =>
        Effect.succeed(repository === UNLISTED),
      );
      expect(grants.workflows).toStrictEqual(BROKER_GRANTS.workflows);
      expect(isGranted(grants)(AUTOFIX)).toBe(true);
    }),
  ));

test("a fork listed by name keeps its listed grants but loses the workflow grant", () =>
  Effect.runPromise(
    Effect.gen(function* listedFork() {
      const autofix = jobIn({ repository: "masseater.dev", workflow: "autofix.yml" });
      const grants = yield* grantsIn(autofix, asked(false));
      expect(workflowGrant(grants.workflows)(autofix)).toStrictEqual(Option.none());
      expect(isGranted(grants)(autofix)).toBe(true);
    }),
  ));

test("a workflow outside the workflow table is decided without asking whether the repository is a fork", () =>
  Effect.runPromise(
    Effect.gen(function* outsideTable() {
      const grants = yield* grantsIn(PUSH, unasked);
      expect(grants.workflows).toStrictEqual(BROKER_GRANTS.workflows);
    }),
  ));
