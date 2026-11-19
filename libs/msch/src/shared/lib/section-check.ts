import { Array as Arr, Effect, Metric, Option, Result, Schema, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { problemInFile } from "./problem.ts";
import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const taggedError = Schema.TaggedError;

class SectionConfigUnreadable extends taggedError<
  SectionConfigUnreadable,
  { readonly brand: unique symbol }
>()("SectionConfigUnreadable", { file: Schema.String }) {}

const CONFIG_FILE = "vite.config.ts";
const FIRST = 1;
const ONE = 1;

const diagnostics = Metric.counter("lint.diagnostics", {
  description: "Diagnostics that each lint rule reported, before msch keeps only the errors",
});

const countDiagnostics = (check: string, found: readonly Linted[]): Effect.Effect<void> =>
  Effect.forEach(
    found,
    (diagnostic) =>
      Metric.update(
        Metric.withAttributes(diagnostics, {
          "lint.check": check,
          "lint.rule": diagnostic.rule,
          "lint.severity": diagnostic.severity,
        }),
        ONE,
      ),
    { concurrency: 1, discard: true },
  );

export interface Linted {
  readonly path: string;
  readonly line: number;
  readonly column?: number;
  readonly rule: string;
  readonly message: string;
  readonly severity: string;
}

export interface LintRequest<Config> {
  readonly root: string;
  readonly files: readonly string[];
  readonly projectFiles: readonly string[];
  readonly config: Config;
}

export interface SectionCheck<
  Config,
  Found extends Linted,
  Failure extends { readonly message: string },
> {
  readonly name: string;
  readonly rule: RuleName;
  readonly pick: (config: unknown) => Config;
  readonly pathspecs: (config: Config) => readonly string[];
  readonly lint: (request: LintRequest<Config>) => Effect.Effect<readonly Found[], Failure>;
  readonly detail: (found: Found) => string;
}

const sectionAt = <Config>(
  file: string,
  pick: (config: unknown) => Config,
): Effect.Effect<Option.Option<Config>, never, RepositoryFiles> =>
  Effect.gen(function* readSection() {
    const files = yield* RepositoryFiles;
    const exists = yield* files.exists(file);
    if (!exists) {
      return Option.none<Config>();
    }
    const config = yield* Effect.tryPromise({
      try: () => resolveConfigFromFile(file),
      catch: () => SectionConfigUnreadable.make({ file }),
    }).pipe(Effect.option);
    return pipe(config, Option.map(pick));
  });

export const checkSection =
  <Config, Found extends Linted, Failure extends { readonly message: string }>(
    check: SectionCheck<Config, Found, Failure>,
  ) =>
  (root: string): Effect.Effect<readonly Problem[], never, RepositoryFiles> =>
    Effect.gen(function* runSection() {
      const files = yield* RepositoryFiles;
      const configFile = files.join(root, CONFIG_FILE);
      const section = yield* sectionAt(configFile, check.pick);
      if (Option.isNone(section)) {
        return [];
      }
      const config = section.value;
      const [listed, projectFiles] = yield* Effect.all(
        [files.matchingFiles(root, check.pathspecs(config)), files.listedFiles(root)],
        { concurrency: "unbounded" },
      );
      const linted = yield* Effect.result(
        check.lint({ root, files: listed, projectFiles, config }),
      );
      yield* Result.match(linted, {
        onFailure: () => Effect.void,
        onSuccess: (found) => countDiagnostics(check.name, found),
      });
      return Result.match(linted, {
        onFailure: (failure) => [problemInFile(check.rule)(configFile, failure.message)],
        onSuccess: (found) =>
          pipe(
            found,
            Arr.filter(({ severity }) => severity === "error"),
            Arr.map((diagnostic): Problem => ({
              file: files.join(root, diagnostic.path),
              line: diagnostic.line,
              column: diagnostic.column ?? FIRST,
              rule: check.rule,
              message: `${diagnostic.rule} ${diagnostic.message}${check.detail(diagnostic)}`,
            })),
          ),
      });
    }).pipe(Effect.withSpan(check.name));
