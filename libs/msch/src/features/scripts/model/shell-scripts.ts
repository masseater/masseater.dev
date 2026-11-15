import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const SHELL_FILE = /\.(?:sh|bash|zsh|ksh|fish|command)$/u;
const SHELL_SHEBANG = /^#!\S*(?:\/|\s)(?:env\s+)?(?:-\S+\s+)*(?:ba|z|k|da)?sh\b|^#!\S*fish\b/u;
const EXTENSION = /\.[^./]+$/u;
const SETTINGS_FILE = ".claude/settings.json";
const READ_CONCURRENCY = 64;
const FIRST = 1;
const RULE: RuleName = "shell-script";
const MESSAGE =
  "is a shell script. Do the work in TypeScript as a Vite+ task in vite.config.ts, a test, or the tool's own hook, and delete this file. Only the SessionStart hook in .claude/settings.json, which installs the toolchain before TypeScript can run, stays a shell script.";

const HookSchema = Schema.Struct({
  command: Schema.optional(Schema.String),
  args: Schema.optional(Schema.Array(Schema.String)),
});
const MatcherSchema = Schema.Struct({ hooks: Schema.Array(HookSchema) });
const HooksSchema = Schema.Struct({ SessionStart: Schema.optional(Schema.Array(MatcherSchema)) });
const SettingsSchema = Schema.Struct({ hooks: Schema.optional(HooksSchema) });
const decodeSettings = Schema.decodeOption(Schema.fromJsonString(SettingsSchema));

type Hook = typeof HookSchema.Type;
type Matcher = typeof MatcherSchema.Type;

const NO_TEXT: readonly string[] = [];

const commandText = ({ command, args }: Hook): readonly string[] => [
  ...Option.toArray(Option.fromUndefinedOr(command)),
  ...pipe(
    Option.fromUndefinedOr(args),
    Option.getOrElse(() => NO_TEXT),
  ),
];

const matcherText = ({ hooks }: Matcher): readonly string[] =>
  pipe(
    hooks,
    Arr.flatMap((hook) => commandText(hook)),
  );

const sessionStartCommands = (source: string): readonly string[] => {
  const matchers = pipe(
    decodeSettings(source),
    Option.flatMap(({ hooks }) => Option.fromUndefinedOr(hooks)),
    Option.flatMap(({ SessionStart }) => Option.fromUndefinedOr(SessionStart)),
  );
  return pipe(
    matchers,
    Option.map(Arr.flatMap((matcher) => matcherText(matcher))),
    Option.getOrElse(() => NO_TEXT),
  );
};

const baseName = (name: string): string =>
  pipe(
    Str.split("/")(name),
    Arr.last,
    Option.getOrElse(() => name),
  );

const hasExtension = (name: string): boolean => EXTENSION.test(baseName(name));

const problemFor = (file: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message: MESSAGE,
});

/** @internal */
export const checkShellScripts = Effect.fn("checkShellScripts")(function* checkShellScripts(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const settings = yield* files.readFile(files.join(root, SETTINGS_FILE));
  const commands = pipe(
    settings,
    Option.map(sessionStartCommands),
    Option.getOrElse(() => NO_TEXT),
  );
  const isSessionStartHook = (name: string): boolean =>
    pipe(commands, Arr.some(Str.includes(name)));
  const isShell = (name: string): Effect.Effect<boolean> => {
    const file = files.join(root, name);
    if (SHELL_FILE.test(name)) {
      return files.exists(file);
    }
    if (hasExtension(name)) {
      return Effect.succeed(false);
    }
    return files
      .readFile(file)
      .pipe(Effect.map(Option.exists((source) => SHELL_SHEBANG.test(source))));
  };
  const candidates = pipe(
    names,
    Arr.filter((name) => !isSessionStartHook(name)),
  );
  const shell = yield* Effect.filter(candidates, isShell, { concurrency: READ_CONCURRENCY });
  return pipe(
    shell,
    Arr.map((name) => problemFor(files.join(root, name))),
  );
});
