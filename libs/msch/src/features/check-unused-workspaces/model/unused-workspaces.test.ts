import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkUnusedWorkspaces } from "./unused-workspaces.ts";

const WORKSPACE = "packages:\n  - apps/*\n  - libs/*\n";
const LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .: {}

  apps/site:
    dependencies:
      used:
        specifier: workspace:*
        version: link:../../libs/used

  apps/worker: {}

  libs/used: {}

  libs/unused: {}

  libs/self:
    devDependencies:
      self:
        specifier: workspace:*
        version: link:.

  libs/published: {}

  libs/command: {}

  libs/tasked: {}
`;
const STACK = `import { Stack } from "alchemy";

export default Stack.make("worker", { main: "./src/app/worker.ts" });
`;

const manifest = (fields: string): string => `{ "private": true, ${fields} }\n`;

const REPOSITORY: Readonly<Record<string, string>> = {
  "pnpm-workspace.yaml": WORKSPACE,
  "pnpm-lock.yaml": LOCKFILE,
  "package.json": manifest(`"name": "root"`),
  "apps/site/package.json": manifest(`"name": "site"`),
  "apps/site/vite.config.ts": `export default { run: { tasks: { build: { command: "vp build", dependsOn: ["tasked#generate"] } } } };\n`,
  "apps/worker/package.json": manifest(`"name": "worker", "exports": "./src/app/worker.ts"`),
  "apps/worker/alchemy.run.ts": STACK,
  "apps/worker/src/app/worker.ts": "export default {};\n",
  "libs/used/package.json": manifest(`"name": "used", "exports": "./src/index.ts"`),
  "libs/unused/package.json": manifest(`"name": "unused", "exports": "./src/index.ts"`),
  "libs/self/package.json": manifest(`"name": "self", "main": "./src/index.ts"`),
  "libs/published/package.json": `{ "name": "published", "exports": "./src/index.ts" }\n`,
  "libs/command/package.json": manifest(
    `"name": "command", "bin": "./bin/command.ts", "exports": "./src/index.ts"`,
  ),
  "libs/tasked/package.json": manifest(`"name": "tasked", "exports": "./src/index.ts"`),
};

const reportsLibrariesNothingDependsOn = Effect.gen(function* reportsLibrariesNothingDependsOn() {
  const root = yield* gitRepositoryWith(REPOSITORY);
  const files = yield* RepositoryFiles;
  const problems = yield* checkUnusedWorkspaces(root);
  const reported = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  expect(Arr.sort(reported, Str.Order)).toStrictEqual([
    "unused-workspace libs/self/package.json",
    "unused-workspace libs/unused/package.json",
  ]);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("workspaces that nothing uses", (it) => {
  it.effect(
    "reports private libraries without dependents, bins, deploy entries or task references",
    () => reportsLibrariesNothingDependsOn,
  );
});
