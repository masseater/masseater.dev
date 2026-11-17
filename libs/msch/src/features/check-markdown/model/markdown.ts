import { diagnosticDetail, lint, markdownPathspecs, y8Section } from "@r_masseater/y8";
import type { Diagnostic, Y8Config } from "@r_masseater/y8";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const taggedError = Schema.TaggedError;

class MarkdownConfigUnreadable extends taggedError<
  MarkdownConfigUnreadable,
  { readonly brand: unique symbol }
>()("MarkdownConfigUnreadable", { file: Schema.String }) {}

const CONFIG_FILE = "vite.config.ts";
const RULE = "markdown";
const FIRST = 1;

const sectionAt = Effect.fn("markdownSection")(function* sectionAt(file: string) {
  const files = yield* RepositoryFiles;
  const exists = yield* files.exists(file);
  if (!exists) {
    return Option.none<Y8Config>();
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => MarkdownConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(config, Option.map(y8Section));
});

const problemOf =
  (root: string, join: (...segments: readonly string[]) => string) =>
  (diagnostic: Diagnostic): Problem => ({
    file: join(root, diagnostic.path),
    line: diagnostic.line,
    column: diagnostic.column ?? FIRST,
    rule: RULE,
    message: `${diagnostic.rule} ${diagnostic.message}${diagnosticDetail(diagnostic)}`,
  });

const failureAt = (file: string, message: string): readonly Problem[] => [
  { file, line: FIRST, column: FIRST, rule: RULE, message },
];

export const checkMarkdown = Effect.fn("checkMarkdown")(function* checkMarkdown(root: string) {
  const files = yield* RepositoryFiles;
  const configFile = files.join(root, CONFIG_FILE);
  const section = yield* sectionAt(configFile);
  if (Option.isNone(section)) {
    return [];
  }
  const config = section.value;
  const [listed, projectFiles] = yield* Effect.all(
    [files.matchingFiles(root, markdownPathspecs({ config })), files.listedFiles(root)],
    { concurrency: "unbounded" },
  );
  return yield* lint({ root, files: listed, projectFiles, config }).pipe(
    Effect.map((diagnostics) =>
      pipe(
        diagnostics,
        Arr.filter(({ severity }) => severity === "error"),
        Arr.map(problemOf(root, files.join)),
      ),
    ),
    Effect.catchTag("Y8Error", (failure) => Effect.succeed(failureAt(configFile, failure.message))),
  );
});
