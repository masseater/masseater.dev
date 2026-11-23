import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkDeployedReadme } from "./deployed-readme.ts";

const WORKSPACES = {
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
  "package.json": '{ "name": "repo", "private": true }',
  "README.md": "# repo\n",
};

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkDeployedReadme(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => repositoryFiles.relative(root, problem.file)),
  );
});

const flagsMissingReadme = Effect.gen(function* flagsMissingReadme() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "apps/site/package.json": '{ "name": "site", "private": true }',
    "apps/site/alchemy.run.ts":
      'import { Worker } from "alchemy/cloudflare";\nawait Worker("site", { main: "./src/app/server.ts", domain: HOST });\n',
    "apps/routed/package.json": '{ "name": "routed", "private": true }',
    "apps/routed/alchemy.run.ts":
      'import { Worker } from "alchemy/cloudflare";\nawait Worker("routed", { routes: [{ pattern: `${ZONE}/routed*`, zoneName: ZONE }] });\n',
    "apps/routed/README.md":
      "# routed\n\nServed at [example.com/routed](https://example.com/routed).\n",
  });
  expect(findings).toStrictEqual(["apps/site/README.md"]);
});

const flagsReadmeWithoutUrl = Effect.gen(function* flagsReadmeWithoutUrl() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "apps/site/package.json": '{ "name": "site", "private": true }',
    "apps/site/alchemy.run.ts":
      'import { Stack } from "alchemy";\nexport default Stack("site", {}, Effect.gen(function* () {\n  const { url } = yield* staticSite(BASE_PATH);\n  return { url };\n}));\n',
    "apps/site/README.md": "# site\n\nA site.\n",
  });
  expect(findings).toStrictEqual(["apps/site/README.md"]);
});

const ignoresUnservedStacks = Effect.gen(function* ignoresUnservedStacks() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "apps/job/package.json": '{ "name": "job", "private": true }',
    "apps/job/alchemy.run.ts":
      'import { Worker } from "alchemy/cloudflare";\nawait Worker("job", { main: "./src/app/job.ts", crons: ["0 * * * *"] });\n',
    "apps/kit/package.json": '{ "name": "kit", "private": true }',
    "apps/kit/src/features/deploy-site/model/site.ts":
      'import { Worker } from "alchemy/cloudflare";\nexport const site = (domain: string) => Worker("site", { domain });\n',
    "apps/kit/alchemy.run.test.ts":
      'import { Worker } from "alchemy/cloudflare";\nawait Worker("t", { domain: "t.example.com" });\n',
  });
  expect(findings).toStrictEqual([]);
});

const flagsRootPackage = Effect.gen(function* flagsRootPackage() {
  const findings = yield* findingsFor({
    "package.json": '{ "name": "single", "private": true }',
    "alchemy.run.ts":
      'import { Worker } from "alchemy/cloudflare";\nawait Worker("single", { domain: "single.example.com" });\n',
  });
  expect(findings).toStrictEqual(["README.md"]);
});

layer(Layer.mergeAll(nodeServicesLayer, fixtureLayer))("checkDeployedReadme", (it) => {
  it.effect(
    "flags a workspace that deploys to an address without a README",
    () => flagsMissingReadme,
  );
  it.effect(
    "flags a README without a URL for a stack that returns its url",
    () => flagsReadmeWithoutUrl,
  );
  it.effect(
    "ignores stacks that serve no address and Alchemy code outside stack files",
    () => ignoresUnservedStacks,
  );
  it.effect("flags a root package that deploys to an address", () => flagsRootPackage);
});
