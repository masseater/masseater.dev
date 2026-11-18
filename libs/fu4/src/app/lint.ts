import { callAddon, traceparent } from "@masseater.dev/lint-host";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { activeRules, isIgnored } from "#/entities/rule/index.ts";
import { kindOf, sourceOf } from "#/entities/source/index.ts";
import { ordered, runFile } from "#/features/run-rules/index.ts";
import type {
  Fu4Config,
  InputKind,
  Project,
  ScriptLanguage,
  Source,
} from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import { native, sourceView } from "#/shared/native/index.ts";
import type { Native, ParsedFile } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: Fu4Config;
}

export interface LintTextInput {
  readonly root: string;
  readonly path: string;
  readonly text: string;
  readonly kind?: InputKind;
  readonly config?: Fu4Config;
}

const CONCURRENT = { concurrency: "unbounded" } as const;

const projectOf = (root: string, addon: Native): Project => {
  const parsed = new Map<string, Option.Option<Source>>();
  const read = (file: string): Option.Option<string> =>
    Option.fromNullishOr(addon.readText(root, file));
  const parse = (file: string): Option.Option<Source> => {
    const source = pipe(
      read(file),
      Option.map((text) => sourceOf(sourceView(addon.parseText(text)))),
    );
    parsed.set(file, source);
    return source;
  };
  return {
    root,
    exists: (file) => addon.pathExists(root, file),
    read,
    parse: (file) => Option.getOrElse(Option.fromNullishOr(parsed.get(file)), () => parse(file)),
  };
};

const scriptParser =
  (addon: Native) =>
  (language: ScriptLanguage, text: string): Source =>
    sourceOf(sourceView(addon.parseScript(language, text)));

const targetsOf = (config: Fu4Config, files: readonly string[]): readonly string[] =>
  pipe(
    files,
    Arr.filter((file) => Option.isSome(kindOf(file)) && !isIgnored(config)(file)),
  );

const parsedFiles = Effect.fn("fu4.parse")(function* parsedFiles(
  root: string,
  targets: readonly string[],
) {
  const parent = yield* traceparent;
  return yield* callAddon({
    addon: native,
    name: "fu4",
    files: targets.length,
    call: (loaded): readonly ParsedFile[] =>
      loaded.parsePaths(root, targets, Option.getOrUndefined(parent)),
    failWith: failedWith,
  });
});

export const lint = Effect.fn("fu4.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  const addon = yield* native;
  const parsed = yield* parsedFiles(input.root, targetsOf(config, input.files));
  const project = projectOf(input.root, addon);
  const lintOne = (file: ParsedFile): ReturnType<typeof runFile> =>
    runFile({
      path: file.path,
      kind: Option.getOrThrow(kindOf(file.path)),
      source: sourceOf(sourceView(file.source)),
      rules: activeRules(config)(file.path),
      settings: config.settings ?? {},
      project,
      parseScript: scriptParser(addon),
    });
  const results = yield* Effect.forEach(parsed, lintOne, CONCURRENT);
  return ordered(Arr.flatten(results));
});

const kindFor = (input: LintTextInput): InputKind =>
  pipe(
    Option.fromNullishOr(input.kind),
    Option.orElse(() => kindOf(input.path)),
    Option.getOrElse((): InputKind => "workflow"),
  );

export const lintText = Effect.fn("fu4.lintText")(function* lintText(input: LintTextInput) {
  const config = input.config ?? {};
  const addon = yield* native;
  const source = sourceOf(sourceView(addon.parseText(input.text)));
  const results = yield* runFile({
    path: input.path,
    kind: kindFor(input),
    source,
    rules: activeRules(config)(input.path),
    settings: config.settings ?? {},
    project: projectOf(input.root, addon),
    parseScript: scriptParser(addon),
  });
  return ordered(results);
});
