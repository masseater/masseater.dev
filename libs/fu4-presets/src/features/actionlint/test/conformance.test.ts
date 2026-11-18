import { NodeServices } from "@effect/platform-node";
import { lintText } from "@r_masseater/fu4";
import type { Diagnostic } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { presets } from "#/app/presets.ts";

import { FIXTURES, KNOWN, PREFIX, expectedOf, normalize, verdictOf } from "./harness.ts";
import type { Outcome } from "./harness.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const SKIPPED = "pyflakes";
const WORKFLOW = /\.ya?ml$/u;
const GROUPS = ["err", "examples", "ok"];
const PASSING = "ok";
const SHELLCHECK = "shellcheck";
const SEQUENTIAL = { concurrency: 1 } as const;

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const readIn = Effect.fn("readIn")(function* readIn(dir: string, name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fileSystem.readFileString(path.join(dir, name));
});

const shown = (diagnostic: Diagnostic): string =>
  `test.yaml:${diagnostic.line}:${diagnostic.column}: ${normalize(diagnostic.message)} [${Str.replace(PREFIX, "")(diagnostic.rule)}]`;

const isWorkflow = (name: string): boolean => WORKFLOW.test(name) && !Str.includes(SKIPPED)(name);

const expectedIn = Effect.fn("expectedIn")(function* expectedIn(
  dir: string,
  group: string,
  stem: string,
) {
  if (group === PASSING) {
    return [];
  }
  const text = yield* readIn(dir, `${stem}.out`);
  return expectedOf(text);
});

const compare = Effect.fn("compare")(function* compare(dir: string, group: string, name: string) {
  const stem = Str.replace(WORKFLOW, "")(name);
  const text = yield* readIn(dir, name);
  const found = yield* lintText({
    root: dir,
    path: "test.yaml",
    kind: "workflow",
    text,
    config: presets.actionlint,
  });
  const want = yield* expectedIn(dir, group, stem);
  const shellchecked = group === PASSING || Str.includes(SHELLCHECK)(stem);
  const have = pipe(
    found,
    Arr.filter((diagnostic) => shellchecked || diagnostic.rule !== `${PREFIX}${SHELLCHECK}`),
    Arr.map(shown),
  );
  return { id: `${group}/${stem}`, want, have } satisfies Outcome;
});

const groupOutcomes = Effect.fn("groupOutcomes")(function* groupOutcomes(
  root: string,
  group: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = path.join(root, group);
  const entries = yield* fileSystem.readDirectory(dir);
  const names = Arr.sort(pipe(entries, Arr.filter(isWorkflow)), Str.Order);
  return yield* Effect.forEach(names, (name) => compare(dir, group, name), SEQUENTIAL);
});

test("matches actionlint on its workflow fixtures", () =>
  Effect.gen(function* conformance() {
    const path = yield* Path.Path;
    const dir = yield* here;
    const root = path.join(dir, FIXTURES);
    const groups = yield* Effect.forEach(GROUPS, (group) => groupOutcomes(root, group), SEQUENTIAL);
    const known = yield* readIn(dir, KNOWN);
    const verdict = verdictOf(known)(Arr.flatten(groups));
    expect(verdict).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
