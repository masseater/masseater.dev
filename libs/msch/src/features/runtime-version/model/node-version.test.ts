import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkNodeVersion } from "./node-version.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkNodeVersion(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsManifestsThatAdmitAnOlderNode = Effect.gen(
  function* flagsManifestsThatAdmitAnOlderNode() {
    const findings = yield* findingsFor({
      "package.json": '{\n  "private": true,\n  "engines": { "node": ">=22.0.0" }\n}\n',
      "libs/published/package.json":
        '{\n  "name": "published",\n  "publishConfig": { "access": "public" }\n}\n',
      "libs/either/package.json":
        '{\n  "publishConfig": {},\n  "engines": { "node": "^24 || >=26" }\n}\n',
      "libs/open/package.json": '{\n  "publishConfig": {},\n  "engines": { "node": "*" }\n}\n',
    });
    expect(findings).toStrictEqual([
      "libs/either/package.json:3 node-version",
      "libs/open/package.json:3 node-version",
      "libs/published/package.json:1 node-version",
      "package.json:3 node-version",
    ]);
  },
);

const flagsPinnedVersionsBelowTheMinimum = Effect.gen(
  function* flagsPinnedVersionsBelowTheMinimum() {
    const findings = yield* findingsFor({
      ".node-version": "v24.11.0\n",
      "apps/server/Dockerfile":
        "FROM ubuntu:26.04 AS fetch\nFROM --platform=linux/amd64 node:22-slim\n",
      ".github/workflows/publish.yml":
        "jobs:\n  publish:\n    steps:\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 24\n",
      "mise.toml": '[tools]\nnode = "24.1.0"\ndotnet = "11.0.100"\n',
    });
    expect(findings).toStrictEqual([
      ".github/workflows/publish.yml:6 node-version",
      ".node-version:1 node-version",
      "apps/server/Dockerfile:2 node-version",
      "mise.toml:2 node-version",
    ]);
  },
);

const passesTheSupportedRuntime = Effect.gen(function* passesTheSupportedRuntime() {
  const findings = yield* findingsFor({
    "package.json": '{\n  "private": true,\n  "engines": { "node": ">=26.0.0" }\n}\n',
    "apps/web/package.json": '{ "name": "web", "private": true }\n',
    "apps/unity/Packages/tool/package.json": '{ "name": "dev.example.tool", "unity": "6000.0" }\n',
    "libs/published/package.json":
      '{\n  "publishConfig": {},\n  "engines": { "node": ">=26" }\n}\n',
    ".nvmrc": "26\n",
    "apps/server/Dockerfile": "FROM node:26.13.1-slim\n",
    ".github/workflows/publish.yml":
      "jobs:\n  publish:\n    steps:\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 26\n",
    "mise.toml": '[tools]\nnode = "26"\n',
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("Node.js is 26 or later", (it) => {
  it.effect(
    "flags published packages without engines.node and ranges that admit an older Node.js",
    () => flagsManifestsThatAdmitAnOlderNode,
  );
  it.effect(
    "flags version files, base images, setup inputs and mise tools below the minimum",
    () => flagsPinnedVersionsBelowTheMinimum,
  );
  it.effect(
    "passes Node.js 26 and packages that are not published",
    () => passesTheSupportedRuntime,
  );
});
