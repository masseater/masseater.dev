import { lint, wismPathspecs, wismSection } from "@r_masseater/wism";
import type { Diagnostic, WismConfig } from "@r_masseater/wism";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const taggedError = Schema.TaggedError;

class StructureConfigUnreadable extends taggedError<
  StructureConfigUnreadable,
  { readonly brand: unique symbol }
>()("StructureConfigUnreadable", { file: Schema.String }) {}

const CONFIG_FILE = "vite.config.ts";
const RULE = "structure";
const FIRST = 1;

const sectionAt = Effect.fn("structureSection")(function* sectionAt(file: string) {
  const files = yield* RepositoryFiles;
  const exists = yield* files.exists(file);
  if (!exists) {
    return Option.none<WismConfig>();
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => StructureConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(config, Option.map(wismSection));
});

const problemOf =
  (root: string, join: (...segments: readonly string[]) => string) =>
  (diagnostic: Diagnostic): Problem => ({
    file: join(root, diagnostic.path),
    line: diagnostic.line,
    column: diagnostic.column,
    rule: RULE,
    message: `${diagnostic.rule} ${diagnostic.message}`,
  });

const failureAt = (file: string, message: string): readonly Problem[] => [
  { file, line: FIRST, column: FIRST, rule: RULE, message },
];

export const checkStructure = Effect.fn("checkStructure")(function* checkStructure(root: string) {
  const files = yield* RepositoryFiles;
  const configFile = files.join(root, CONFIG_FILE);
  const section = yield* sectionAt(configFile);
  if (Option.isNone(section)) {
    return [];
  }
  const config = section.value;
  const listed = yield* files.matchingFiles(root, wismPathspecs(config));
  return yield* lint({ root, files: listed, config }).pipe(
    Effect.map((diagnostics) =>
      pipe(
        diagnostics,
        Arr.filter(({ severity }) => severity === "error"),
        Arr.map(problemOf(root, files.join)),
      ),
    ),
    Effect.catchTag("WismError", (failure) =>
      Effect.succeed(failureAt(configFile, failure.message)),
    ),
  );
});
