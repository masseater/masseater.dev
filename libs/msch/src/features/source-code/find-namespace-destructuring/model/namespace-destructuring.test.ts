import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { expect } from "vite-plus/test";

import { typeScriptCompiler, withProject } from "#/entities/project/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { namespaceDestructuringIn } from "./namespace-destructuring.ts";

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(source: string) {
  const files = yield* RepositoryFiles;
  const tsconfig = yield* stringifyUnknown({
    compilerOptions: {
      strict: true,
      module: "nodenext",
      moduleResolution: "nodenext",
      noEmit: true,
    },
    include: ["src"],
  });
  const root = yield* directoryWith({
    "package.json": '{ "name": "fixture" }',
    "tsconfig.json": tsconfig,
    "src/local.ts": "export const Local = { size: 1 };\n",
    "src/use.ts": source,
  });
  const compiler = yield* typeScriptCompiler;
  const found = yield* withProject({ compiler, root, generated: [] })(
    files.join(root, "tsconfig.json"),
  )((project) =>
    Effect.sync(() =>
      pipe(
        project.sourceFiles,
        Arr.flatMap(namespaceDestructuringIn()),
        Arr.map((problem) => `${files.relative(root, problem.file)}:${String(problem.line)}`),
      ),
    ),
  );
  return Option.getOrElse(found, (): readonly string[] => []);
}, Effect.scoped);

const reportsDestructuredPackageImports = Effect.gen(function* reportsDestructuredPackageImports() {
  const findings = yield* findingsFor(
    pipe(
      [
        'import { Schema } from "effect";',
        'import * as Path from "node:path";',
        "const { Finite } = Schema;",
        "export const { join } = Path;",
        "export const number = Finite;",
        "",
      ],
      Arr.join("\n"),
    ),
  );
  expect(findings).toStrictEqual(["src/use.ts:3", "src/use.ts:4"]);
});

const keepsMemberAccessAndLocalObjects = Effect.gen(function* keepsMemberAccessAndLocalObjects() {
  const findings = yield* findingsFor(
    pipe(
      [
        'import { Schema } from "effect";',
        'import type { Duration } from "effect";',
        'import { Local } from "./local.ts";',
        "const { size } = Local;",
        "const settings = { width: 1 };",
        "const { width } = settings;",
        "export const number = Schema.Finite;",
        "export const total = size + width;",
        "export type Span = Duration.Duration;",
        "",
      ],
      Arr.join("\n"),
    ),
  );
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("namespace-destructuring", (it) => {
  it.effect("reports destructured package imports", () => reportsDestructuredPackageImports);
  it.effect("keeps member access and local objects", () => keepsMemberAccessAndLocalObjects);
});
