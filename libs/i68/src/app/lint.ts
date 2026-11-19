import { sortByPosition } from "@masseater.dev/lint-host";
import { readSong } from "@r_masseater/fumx-parser";
import type { SourceIssue } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, pipe } from "effect";

import { flattenConfig, resolve, unknownPlugins, unknownRules } from "#/entities/rule/index.ts";
import type { ResolvedRule } from "#/entities/rule/index.ts";
import { readSongFile } from "#/features/read-songs/index.ts";
import type { Read, SongFile } from "#/features/read-songs/index.ts";
import { runRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, I68Config } from "#/shared/config/index.ts";
import { I68Error } from "#/shared/lib/errors.ts";

const PARSE_RULE = "i68/parse";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly read: Read;
  readonly config?: I68Config;
}

export interface TextInput {
  readonly path: string;
  readonly text: string;
  readonly read?: Read;
  readonly config?: I68Config;
}

const failIfAny =
  (problem: string) =>
  (names: readonly string[]): Effect.Effect<void, I68Error> =>
    Arr.match(names, {
      onEmpty: () => Effect.void,
      onNonEmpty: (found) =>
        Effect.fail(I68Error.make({ message: `${problem}: ${Arr.join(found, ", ")}` })),
    });

const UNKNOWN_PLUGINS = failIfAny("rules name plugins that are not configured");
const UNKNOWN_RULES = failIfAny("rules name rules that their plugins do not have");

const checkPlugins = (config: I68Config): Effect.Effect<void, I68Error> => {
  const rules = UNKNOWN_RULES(unknownRules(config));
  return UNKNOWN_PLUGINS(unknownPlugins(config)).pipe(Effect.andThen(rules));
};

const rulesOf = (
  config: I68Config | undefined,
): Effect.Effect<readonly ResolvedRule[], I68Error> => {
  const flat = flattenConfig(config ?? {});
  return checkPlugins(flat).pipe(Effect.as(resolve(flat)));
};

const parseDiagnosticsOf =
  (file: string) =>
  (issues: readonly SourceIssue[]): readonly Diagnostic[] =>
    pipe(
      issues,
      Arr.map((issue): Diagnostic => ({
        path: file,
        line: issue.line,
        column: issue.column,
        rule: PARSE_RULE,
        message: issue.message,
        severity: "error",
      })),
    );

const lintFile =
  (rules: readonly ResolvedRule[]) =>
  (song: SongFile): Effect.Effect<readonly Diagnostic[], I68Error> => {
    if (song.source.status === "invalid") {
      return Effect.succeed(parseDiagnosticsOf(song.file)(song.source.issues));
    }
    return runRules({
      path: song.file,
      comments: song.source.outline.comments,
      song: song.source.song,
      rules,
    });
  };

export const lint = Effect.fn("i68.lint")(function* lint(input: LintInput) {
  const rules = yield* rulesOf(input.config);
  const found = yield* Effect.all(
    pipe(
      input.files,
      Arr.map((file) =>
        readSongFile({ root: input.root, file, read: input.read }).pipe(
          Effect.flatMap(lintFile(rules)),
        ),
      ),
    ),
    { concurrency: "unbounded" },
  );
  return sortByPosition<Diagnostic>(Arr.flatten(found));
});

const notFound = (path: string): Effect.Effect<string, I68Error> =>
  Effect.fail(I68Error.make({ message: `could not read ${path}` }));

const readerOf =
  (input: TextInput): Read =>
  (path) => {
    if (path === input.path) {
      return Effect.succeed(input.text);
    }
    return (input.read ?? notFound)(path);
  };

export const lintText = Effect.fn("i68.lintText")(function* lintText(input: TextInput) {
  const rules = yield* rulesOf(input.config);
  const source = yield* readSong({ path: input.path, read: readerOf(input) });
  const found = yield* lintFile(rules)({ file: input.path, source });
  return sortByPosition<Diagnostic>(found);
});
