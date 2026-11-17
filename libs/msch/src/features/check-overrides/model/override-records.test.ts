import { layer } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { expect } from "vite-plus/test";

import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { unlessPassed } from "./override-records.ts";

const LOCKFILE = "pnpm-lock.yaml";
const INPUTS = ["package.json", LOCKFILE] as const;
const SOURCES = { "package.json": "{}", [LOCKFILE]: "lockfileVersion: '9.0'\n" };
const CLEAN: readonly Problem[] = [];
const ONCE = 1;
const TWICE = 2;

const problemIn = (root: string): Problem => ({
  file: `${root}/pnpm-workspace.yaml`,
  line: 1,
  column: 1,
  rule: "unused-override",
  message: "Remove it.",
});

const runsAfter = Effect.fn("runsAfter")(function* runsAfter(
  found: (root: string) => readonly Problem[],
  between: (root: string) => Effect.Effect<void, never, FixtureFiles | RepositoryFiles>,
) {
  const root = yield* directoryWith(SOURCES);
  const runs = yield* Ref.make(0);
  const check = Ref.update(runs, (count) => count + ONCE).pipe(Effect.as(found(root)));
  const first = yield* unlessPassed(root, INPUTS, check);
  yield* between(root);
  const second = yield* unlessPassed(root, INPUTS, check);
  return { first, second, runs: yield* Ref.get(runs) };
});

const rewriteLockfile = Effect.fn("rewriteLockfile")(function* rewriteLockfile(root: string) {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  yield* fixtures.writeFile(files.join(root, LOCKFILE), "lockfileVersion: '9.1'\n");
});

const skipsTheCheckAfterAPass = Effect.gen(function* skipsTheCheckAfterAPass() {
  const result = yield* runsAfter(
    () => CLEAN,
    () => Effect.void,
  );
  expect(result).toStrictEqual({ first: CLEAN, second: CLEAN, runs: ONCE });
});

const runsAgainWhenAnInputChanges = Effect.gen(function* runsAgainWhenAnInputChanges() {
  const result = yield* runsAfter(() => CLEAN, rewriteLockfile);
  expect(result.runs).toBe(TWICE);
});

const runsAgainAfterProblems = Effect.gen(function* runsAgainAfterProblems() {
  const result = yield* runsAfter(
    (root) => [problemIn(root)],
    () => Effect.void,
  );
  expect(result.runs).toBe(TWICE);
  expect(result.second).toStrictEqual(result.first);
});

layer(fixtureLayer)("override pass records", (it) => {
  it.effect("skips the check after it passed with the same inputs", () => skipsTheCheckAfterAPass);
  it.effect("runs the check again when an input changes", () => runsAgainWhenAnInputChanges);
  it.effect("runs the check again after it found problems", () => runsAgainAfterProblems);
});
