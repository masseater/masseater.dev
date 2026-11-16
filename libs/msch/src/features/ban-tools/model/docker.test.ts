import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkDocker } from "./docker.ts";

const CLI = "docker";
const COMPOSE = `${CLI}-compose`;
const BUILD_FILE = "Dockerfile";
const BUILD_ACTION = `${CLI}/build-push-action@v7`;

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkDocker(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsDockerFiles = Effect.gen(function* flagsDockerFiles() {
  const findings = yield* findingsFor({
    [`apps/server/${BUILD_FILE}`]: "FROM node:26\n",
    [`apps/server/${BUILD_FILE}.dev`]: "FROM node:26\n",
    [`apps/server/.${CLI}ignore`]: "node_modules\n",
    [`${COMPOSE}.yml`]: "services: {}\n",
    "apps/player/Containerfile": "FROM node:26\n",
    "apps/player/.containerignore": "node_modules\n",
    "compose.yaml": "services: {}\n",
  });
  expect(findings).toStrictEqual([
    `apps/server/.${CLI}ignore:1 docker-file`,
    `apps/server/${BUILD_FILE}:1 docker-file`,
    `apps/server/${BUILD_FILE}.dev:1 docker-file`,
    `${COMPOSE}.yml:1 docker-file`,
  ]);
});

const flagsDockerCommands = Effect.gen(function* flagsDockerCommands() {
  const findings = yield* findingsFor({
    ".github/workflows/deploy.yml": pipe(
      [
        "jobs:",
        "  deploy:",
        "    steps:",
        `      - uses: ${BUILD_ACTION}`,
        `      - run: ${CLI} build --tag app .`,
        "",
      ],
      Arr.join("\n"),
    ),
    "vite.config.ts": `export const task = "${COMPOSE} up --detach";\n`,
    "src/build.ts": `ChildProcess.make(\n  "${CLI}",\n  ["build", "."],\n);\n`,
    "src/main.rs": `let mut command = Command::new("${CLI}");\n`,
  });
  expect(findings).toStrictEqual([
    ".github/workflows/deploy.yml:4 docker-command",
    ".github/workflows/deploy.yml:5 docker-command",
    "src/build.ts:1 docker-command",
    "src/main.rs:1 docker-command",
    "vite.config.ts:1 docker-command",
  ]);
});

const passesPodmanAndNames = Effect.gen(function* passesPodmanAndNames() {
  const findings = yield* findingsFor({
    ".github/workflows/deploy.yml":
      "jobs:\n  deploy:\n    steps:\n      - run: podman build --tag app .\n",
    "src/build.ts": 'ChildProcess.make("podman", ["build", "."]);\n',
    "src/images.ts": `export const IMAGE = "${CLI}.io/library/node:26";\nexport const NAME = "${CLI}";\n`,
    "src/probes.ts": `export const PATHS = ["${COMPOSE}.yml", "/${CLI}file"];\n`,
    "docs/containers.md": `${CLI} build は使わない。\n`,
    "pnpm-lock.yaml": `packages:\n  is-${CLI}: {}\n`,
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("Docker is not used", (it) => {
  it.effect("flags files named for Docker", () => flagsDockerFiles);
  it.effect(
    "flags Docker commands and actions in workflows, tasks and spawned processes",
    () => flagsDockerCommands,
  );
  it.effect("passes podman and code that only names Docker", () => passesPodmanAndNames);
});
