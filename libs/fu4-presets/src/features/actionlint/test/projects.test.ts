import { NodeServices } from "@effect/platform-node";
import { lintText } from "@r_masseater/fu4";
import type { Diagnostic } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { FIXTURES, KNOWN, PREFIX, expectedOf, normalize, verdictOf } from "./harness.ts";
import type { Outcome } from "./harness.ts";
import { projectConfigOf } from "./project-config.ts";
import type { ProjectConfig } from "./project-config.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const WORKFLOW = /\.ya?ml$/u;
const NOT_PROJECT = /\.(?:out|md)$/u;
const CONFIG = "actionlint.yaml";
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

const shown =
  (file: string, root: string) =>
  (diagnostic: Diagnostic): string => {
    const message = Str.replaceAll(root, "testdata/projects")(normalize(diagnostic.message));
    return `${file}:${diagnostic.line}:${diagnostic.column}: ${message} [${Str.replace(PREFIX, "")(diagnostic.rule)}]`;
  };

const lintFile = Effect.fn("lintFile")(function* lintFile(
  dir: string,
  project: ProjectConfig,
  file: string,
) {
  const path = yield* Path.Path;
  const text = yield* readIn(dir, file);
  const found = yield* lintText({
    root: dir,
    path: file,
    kind: "workflow",
    text,
    config: project.config,
  });
  const root = path.dirname(dir);
  return pipe(
    found,
    Arr.filter((diagnostic) => !project.ignored(file, diagnostic.message)),
    Arr.map(shown(file, root)),
  );
});

const configIn = Effect.fn("configIn")(function* configIn(dir: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.join(dir, CONFIG);
  const exists = yield* fileSystem.exists(file);
  if (!exists) {
    return projectConfigOf(Option.none());
  }
  const text = yield* fileSystem.readFileString(file);
  return projectConfigOf(Option.some(text));
});

const workflowsIn = Effect.fn("workflowsIn")(function* workflowsIn(dir: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(path.join(dir, "workflows"), { recursive: true });
  const sorted = Arr.sort(
    pipe(
      entries,
      Arr.filter((entry) => WORKFLOW.test(entry)),
    ),
    Str.Order,
  );
  return pipe(
    sorted,
    Arr.map((entry) => `workflows/${entry}`),
  );
});

const compare = Effect.fn("compare")(function* compare(root: string, name: string) {
  const path = yield* Path.Path;
  const dir = path.join(root, name);
  const project = yield* configIn(dir);
  const files = yield* workflowsIn(dir);
  const have = yield* Effect.forEach(files, (file) => lintFile(dir, project, file), SEQUENTIAL);
  const expected = yield* readIn(root, `${name}.out`);
  return {
    id: `projects/${name}`,
    want: expectedOf(expected),
    have: Arr.flatten(have),
  } satisfies Outcome;
});

test("matches actionlint on its project fixtures", () =>
  Effect.gen(function* projects() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const root = path.join(dir, FIXTURES, "projects");
    const entries = yield* fileSystem.readDirectory(root);
    const names = Arr.sort(
      pipe(
        entries,
        Arr.filter((entry) => !NOT_PROJECT.test(entry)),
      ),
      Str.Order,
    );
    const outcomes = yield* Effect.forEach(names, (name) => compare(root, name), SEQUENTIAL);
    const known = yield* readIn(dir, KNOWN);
    expect(verdictOf(known)(outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
