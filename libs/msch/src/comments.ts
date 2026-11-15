import path from "node:path";

import {
  Array as Arr,
  Effect,
  HashSet,
  Option,
  Predicate,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { commentsWith, loadGrammars } from "./comment-readers.ts";
import type { Reader } from "./comment-readers.ts";
import type { FoundComment } from "./found-comment.ts";
import { COMMENT_DIRECTIVES } from "./lint/comment-directives.ts";
import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const RULE: RuleName = "comment";
const CONFIG_FILE = "vite.config.ts";
const VENDORED_PATHSPEC = ":(attr:linguist-vendored)";
const READ_CONCURRENCY = 64;
const START = 0;
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;

const READERS: readonly (readonly [RegExp, Reader])[] = [
  [/\.(?:[cm]?jsx?)$/u, "javascript"],
  [/\.(?:[cm]?ts)$/u, "typescript"],
  [/\.tsx$/u, "tsx"],
  [/\.rs$/u, "rust"],
  [/\.(?:cs|csx)$/u, "c-sharp"],
  [/\.(?:sh|bash|zsh|ksh)$/u, "bash"],
  [/(?:^|\/)\.(?:vite-hooks|husky|githooks)\/[^./][^/]*$/u, "bash"],
  [/\.(?:ps1|psm1|psd1)$/u, "powershell"],
  [/\.go$/u, "go"],
  [/\.(?:java|kt|kts)$/u, "java"],
  [/\.(?:rb|rake)$/u, "ruby"],
  [/\.php$/u, "php"],
  [/\.(?:c|h|cc|cpp|cxx|hpp|hh|m|mm|glsl|frag|vert|comp|wgsl|hlsl|metal)$/u, "cpp"],
  [/\.(?:css|pcss)$/u, "css"],
  [/\.(?:html?|vue|svelte|astro)$/u, "html"],
  [/\.(?:xml|xaml|plist|resx|props|targets|[a-z]+proj|manifest|nuspec)$/u, "xml"],
  [/\.ya?ml$/u, "yaml"],
  [/\.toml$/u, "toml"],
  [/\.sql$/u, "sql"],
  [/(?:^|\/)(?:Dockerfile|Containerfile)(?:\.[^/]+)?$|\.dockerfile$/u, "dockerfile"],
];

const SHEBANG_READERS: readonly (readonly [RegExp, Reader])[] = [
  [/^#!.*\b(?:ba|z|k|da)?sh\b/u, "bash"],
  [/^#!.*\b(?:node|bun|deno|tsx)\b/u, "javascript"],
  [/^#!.*\bpwsh\b/u, "powershell"],
];

const SHEBANG = "#!";
const PIN = /@(?:[0-9a-f]{40}|sha256:[0-9a-f]{64})\s*$/u;
const VERSION = /^\s?v?\d[\w.+-]*$/u;
const DELIMITERS = /^(?:\/\/|\/\*|<!--|<#|#|--)|(?:\*\/|-->|#>)$/gu;
const MESSAGE =
  "Comments are not written in this repository. Say it with names and types in the code, put the reason in the commit message, and delete the comment.";

const Patterns = Schema.Array(Schema.String);
const CommentSettings = Schema.Struct({ allow: Patterns });
const MschSettings = Schema.Struct({ comments: Schema.optional(CommentSettings) });
const LintSettings = Schema.Struct({ ignorePatterns: Schema.optional(Patterns) });

const RootConfig = Schema.Struct({
  msch: Schema.optional(MschSettings),
  lint: Schema.optional(LintSettings),
});

type RootConfigType = typeof RootConfig.Type;

interface RootSettings {
  readonly allow: readonly string[];
  readonly ignorePatterns: readonly string[];
}

interface Listed {
  readonly name: string;
  readonly file: string;
}

const NO_SETTINGS: RootSettings = { allow: [], ignorePatterns: [] };
const NONE: readonly Problem[] = [];

const taggedError = Schema.TaggedError;

class CommentConfigUnreadable extends taggedError<
  CommentConfigUnreadable,
  { readonly brand: unique symbol }
>()("CommentConfigUnreadable", { file: Schema.String }) {}

const shebangReader = (source: string): Option.Option<readonly [RegExp, Reader]> => {
  if (!Str.startsWith(SHEBANG)(source)) {
    return Option.none();
  }
  return pipe(
    SHEBANG_READERS,
    Arr.findFirst(([pattern]) => pattern.test(source)),
  );
};

const readerOf = (name: string, source: string): Option.Option<Reader> =>
  pipe(
    READERS,
    Arr.findFirst(([pattern]) => pattern.test(name)),
    Option.orElse(() => shebangReader(source)),
    Option.map(([, reader]) => reader),
  );

const valueOf = (text: string): string => Str.replaceAll(DELIMITERS, "")(text);

const lineBefore = (source: string, index: number): string => {
  const lines = pipe(source, Str.slice(START, index), Str.split("\n"));
  return Option.getOrElse(Arr.last(lines), () => "");
};

const isPinVersion = (source: string, { index, text }: FoundComment): boolean =>
  PIN.test(lineBefore(source, index)) && VERSION.test(valueOf(text));

const isShebang = ({ index, text }: FoundComment): boolean =>
  index === START && Str.startsWith(SHEBANG)(text);

const isAllowed =
  (source: string, directives: RegExp) =>
  (comment: FoundComment): boolean =>
    isShebang(comment) || directives.test(valueOf(comment.text)) || isPinVersion(source, comment);

const problemOf =
  (file: string, source: string) =>
  ({ index }: FoundComment): Problem => ({
    file,
    ...positionOf(source)(index),
    rule: RULE,
    message: MESSAGE,
  });

const unreadableProblem = (file: string, message: string): Problem => ({
  file,
  line: FIRST_LINE,
  column: FIRST_COLUMN,
  rule: RULE,
  message: `msch could not read the comments in this file: ${message}`,
});

const settingsOf = ({ msch, lint }: RootConfigType): RootSettings => ({
  allow: pipe(
    Option.fromUndefinedOr(msch),
    Option.flatMap(({ comments }) => Option.fromUndefinedOr(comments)),
    Option.match({ onNone: () => NO_SETTINGS.allow, onSome: ({ allow }) => allow }),
  ),
  ignorePatterns: pipe(
    Option.fromUndefinedOr(lint),
    Option.flatMap(({ ignorePatterns }) => Option.fromUndefinedOr(ignorePatterns)),
    Option.getOrElse(() => NO_SETTINGS.ignorePatterns),
  ),
});

const rootSettings = Effect.fn("rootSettings")(function* rootSettings(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, CONFIG_FILE);
  const exists = yield* files.exists(file);
  if (!exists) {
    return NO_SETTINGS;
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => CommentConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(
    config,
    Option.flatMap(Schema.decodeUnknownOption(RootConfig)),
    Option.match({ onNone: () => NO_SETTINGS, onSome: settingsOf }),
  );
});

const directivePattern = (directives: readonly string[]): RegExp =>
  new RegExp(String.raw`^\s?(?:${Arr.join(directives, "|")})`, "u");

const isIgnored =
  (patterns: readonly string[]) =>
  (name: string): boolean =>
    pipe(
      patterns,
      Arr.some((pattern) => path.matchesGlob(name, pattern)),
    );

const scannedFiles = Effect.fn("scannedFiles")(function* scannedFiles(
  root: string,
  settings: RootSettings,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const generated = yield* files.generatedFiles(root);
  const vendored = yield* files.matchingFiles(root, [VENDORED_PATHSPEC]);
  const skipped = HashSet.fromIterable([
    ...generated,
    ...pipe(
      vendored,
      Arr.map((name) => files.join(root, name)),
    ),
  ]);
  return pipe(
    listed,
    Arr.filter((name) => !isIgnored(settings.ignorePatterns)(name)),
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
    Arr.filter(({ file }) => !HashSet.has(skipped, file)),
  );
});

/** @internal */
const checkComments = Effect.fn("checkComments")(function* checkComments(root: string) {
  const files = yield* RepositoryFiles;
  const settings = yield* rootSettings(root);
  const scanned = yield* scannedFiles(root, settings);
  const directives = directivePattern([...COMMENT_DIRECTIVES, ...settings.allow]);
  const grammars = yield* loadGrammars();
  const comments = commentsWith(grammars);
  const problemsIn = (
    { name, file }: Listed,
    source: string,
  ): Effect.Effect<readonly Problem[]> => {
    const kept = Predicate.not(isAllowed(source, directives));
    const toProblem = problemOf(file, source);
    return Option.match(readerOf(name, source), {
      onNone: () => Effect.succeed(NONE),
      onSome: (reader) =>
        comments(reader, source).pipe(
          Effect.map(Arr.filter(kept)),
          Effect.map(Arr.map(toProblem)),
          Effect.catchTag("CommentsUnreadable", ({ message }) =>
            Effect.succeed([unreadableProblem(file, message)]),
          ),
        ),
    });
  };
  const found = yield* Effect.forEach(
    scanned,
    (entry) =>
      files.readFile(entry.file).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(NONE),
            onSome: (source) => problemsIn(entry, source),
          }),
        ),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});

export { checkComments };
