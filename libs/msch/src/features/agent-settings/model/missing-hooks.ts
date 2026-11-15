import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "missing-hook";
const SETTINGS_FILE = /^\.claude\/settings\.json$/u;
const PLUGIN_HOOKS_FILE = /(?:^|\/)hooks\/hooks\.json$/u;
const PROJECT_PATH =
  /(?<optional>--env-file-if-exists=)?\$\{?CLAUDE_PROJECT_DIR\}?(?:\\")?\/(?<path>[\w.@/-]+)/gu;
const PLUGIN_PATH =
  /(?<optional>--env-file-if-exists=)?\$\{?CLAUDE_PLUGIN_ROOT\}?(?:\\")?\/(?<path>[\w.@/-]+)/gu;
const PLUGIN_ROOT = "..";
const READ_CONCURRENCY = 16;

interface HookFile {
  readonly root: string;
  readonly file: string;
  readonly base: string;
  readonly pattern: RegExp;
}

interface Reference {
  readonly path: string;
  readonly index: number;
}

const START = 0;

const referenceOf = (found: RegExpMatchArray): readonly Reference[] =>
  pipe(
    groupOf("path")(found),
    Option.filter(() => Option.isNone(groupOf("optional")(found))),
    Option.map((path): Reference => ({ path, index: found.index ?? START })),
    Option.toArray,
  );

const referencesIn = (pattern: RegExp, source: string): readonly Reference[] =>
  pipe(Arr.fromIterable(Str.matchAll(pattern)(source)), Arr.flatMap(referenceOf));

const problemsIn = Effect.fn("problemsIn")(function* problemsIn({
  root,
  file,
  base,
  pattern,
}: HookFile) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  if (Option.isNone(text)) {
    return [];
  }
  const source = text.value;
  const absent = yield* Effect.filter(referencesIn(pattern, source), ({ path }) =>
    files.exists(files.join(base, path)).pipe(Effect.map((exists) => !exists)),
  );
  const targetOf = ({ path }: Reference): string => files.join(base, path);
  const built = yield* files.ignoredPaths(root, pipe(absent, Arr.map(targetOf)));
  const missing = pipe(
    absent,
    Arr.filter((reference) => !Arr.contains(built, targetOf(reference))),
  );
  return pipe(
    missing,
    Arr.map(({ path, index }): Problem => ({
      file,
      ...positionOf(source)(index),
      rule: RULE,
      message: `runs ${path}, which does not exist. The hook fails every time it fires. Point it at a file that exists or remove the hook.`,
    })),
  );
});

/** @internal */
export const checkMissingHooks = Effect.fn("checkMissingHooks")(function* checkMissingHooks(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const hookFiles = pipe(
    listed,
    Arr.flatMap((name): readonly HookFile[] => {
      const file = files.join(root, name);
      if (SETTINGS_FILE.test(name)) {
        return [{ root, file, base: root, pattern: PROJECT_PATH }];
      }
      if (PLUGIN_HOOKS_FILE.test(name)) {
        return [
          { root, file, base: files.join(files.dirname(file), PLUGIN_ROOT), pattern: PLUGIN_PATH },
        ];
      }
      return [];
    }),
  );
  const found = yield* Effect.forEach(hookFiles, problemsIn, { concurrency: READ_CONCURRENCY });
  return Arr.flatten(found);
});
