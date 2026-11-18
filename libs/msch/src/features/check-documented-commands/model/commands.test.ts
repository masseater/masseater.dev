import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Option, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles, nodeServicesLayer } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkDocumentedCommands } from "./commands.ts";
import { GivenTaskGraph } from "./task-graph.ts";
import type { TaskGraph } from "./task-graph.ts";

const GRAPH: TaskGraph = {
  packages: { ".": { name: "root" }, "libs/tool": { name: "@example/tool" } },
  tasks: {
    verify: { package: ".", name: "verify" },
    "libs/tool#native": { package: "libs/tool", name: "native" },
  },
};

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkDocumentedCommands(root).pipe(
    Effect.provideService(GivenTaskGraph, Option.some(GRAPH)),
  );
  return pipe(
    problems,
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.message}`,
    ),
  );
});

const passesTasksThatExist = Effect.gen(function* passesTasksThatExist() {
  const found = yield* findingsFor({
    "AGENTS.md": "Run `vp run verify`.\n",
    "libs/tool/AGENTS.md":
      "Build with `vp run native`.\nOr `vp run --filter @example/tool native` and `vp run -r verify`.\nRun `vp run <name>` for anything else.\n",
  });
  expect(found).toStrictEqual([]);
});

const flagsTasksThatDoNotExist = Effect.gen(function* flagsTasksThatDoNotExist() {
  const found = yield* findingsFor({
    "AGENTS.md": "Run `vp run native`.\n",
    "libs/tool/AGENTS.md": "Run\n`vp run --filter @example/tool codegen`.\n",
    "libs/tool/SKILL.md": "Run `vp run codegen`.\n",
  });
  expect(found).toStrictEqual([
    expect.stringMatching(/^AGENTS\.md:1 `vp run native` runs task native, but the package/u),
    expect.stringMatching(/^libs\/tool\/AGENTS\.md:2 .*package @example\/tool has no such task/u),
  ]);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("commands in AGENTS.md", (it) => {
  it.effect("passes commands that run existing tasks", () => passesTasksThatExist);
  it.effect("flags commands that run missing tasks", () => flagsTasksThatDoNotExist);
});
