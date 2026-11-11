import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const PYTHON_FILE =
  /(?:\.(?:py|pyi|pyw|pyx|ipynb)|(?:^|\/)(?:pyproject\.toml|uv\.lock|uv\.toml|poetry\.lock|Pipfile|Pipfile\.lock|setup\.cfg|tox\.ini|pytest\.ini|\.python-version|requirements[^/]*\.txt))$/u;

const SCANNED_FILE =
  /(?:\.(?:[cm]?[jt]sx?|jsonc?|toml|ya?ml|sh|bash|zsh|fish|rs|cs|go|mk)|(?:^|\/)(?:Dockerfile[^/]*|Makefile|justfile|\.tool-versions|[^./][^./]*))$/u;

const LOCKFILE = /(?:^|\/)(?:[^/]*\.lock|[^/]*-lock\.(?:json|ya?ml))$/u;

const TOOL_VERSIONS = /(?:^|\/)(?:\.?mise(?:\.[^/]+)?\.toml|\.tool-versions)$/u;

const COMMAND_PATTERNS: readonly RegExp[] = [
  /(?<![\w./@-])python[\d.]*[ \t]+(?:[-"'$./]|\S+\.py\b)/gu,
  /(?<![\w./@-])pip3?[ \t]+(?:install|uninstall|download|freeze|wheel|compile|sync)\b/gu,
  /(?<![\w./@-])pipx[ \t]+(?:run|install|inject|upgrade)\b/gu,
  /(?<![\w./@-])uvx[ \t]+[^\s=:,;)|&]/gu,
  /(?<![\w./@-])uv[ \t]+(?:run|sync|lock|pip|tool|venv|add|remove|python|export|build|publish|init|tree|cache|self)\b/gu,
  /(?<![\w./@-])poetry[ \t]+(?:run|install|add|lock|build|publish|shell|export)\b/gu,
  /(?:\bcommand["']?\s*[:=]\s*|(?:\bspawn\w*|\bexec\w*|\bexeca|Command::new|ChildProcess\.make|\$)\(\s*)["'`](?:python[\d.]*|pip3?|pipx|uvx?|poetry)["'`]/gu,
  /\buses:\s*["']?(?:actions\/setup-python|astral-sh\/setup-uv|astral-sh\/ruff-action|pypa\/[\w.-]+|snok\/install-poetry|abatilo\/actions-poetry|conda-incubator\/setup-miniconda|mamba-org\/setup-micromamba|pdm-project\/setup-pdm)\b/gu,
];

const TOOL_PATTERNS: readonly RegExp[] = [
  /^[ \t]*["']?(?:python|uv|pipx|poetry|ruff|pdm|hatch|pipx:[^"'\s=]+)["']?[ \t]*(?:=|[ \t]+\S)/gmu,
];

const READ_CONCURRENCY = 64;
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const WHOLE_MATCH = 0;
const FILE_RULE: RuleName = "python-file";
const COMMAND_RULE: RuleName = "python-command";

interface Listed {
  readonly name: string;
  readonly file: string;
}

const fileProblem = ({ file }: Listed): Problem => ({
  file,
  line: FIRST_LINE,
  column: FIRST_COLUMN,
  rule: FILE_RULE,
  message: "Python is not used in this repository. Replace this file with TypeScript or Rust.",
});

const patternsFor = (name: string): readonly RegExp[] => {
  if (TOOL_VERSIONS.test(name)) {
    return [...COMMAND_PATTERNS, ...TOOL_PATTERNS];
  }
  return COMMAND_PATTERNS;
};

const commandProblem =
  ({ file }: Listed, source: string) =>
  (found: RegExpMatchArray): Problem => ({
    file,
    ...positionOf(source)(found.index ?? WHOLE_MATCH),
    rule: COMMAND_RULE,
    message: `Python is not used in this repository. Remove \`${Str.trim(found[WHOLE_MATCH])}\` and do the work in TypeScript or Rust.`,
  });

const commandProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    patternsFor(entry.name),
    Arr.flatMap((pattern) => Arr.fromIterable(Str.matchAll(pattern)(source))),
    Arr.map(commandProblem(entry, source)),
  );

const isPython = ({ name }: Listed): boolean => PYTHON_FILE.test(name);

const isScanned = (entry: Listed): boolean =>
  !isPython(entry) && SCANNED_FILE.test(entry.name) && !LOCKFILE.test(entry.name);

/** @internal */
const checkPython = Effect.fn("checkPython")(function* checkPython(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const listed = pipe(
    names,
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
  );
  const problemsIn = (entry: Listed): Effect.Effect<readonly Problem[]> =>
    files.readFile(entry.file).pipe(
      Effect.map(
        Option.match({
          onNone: (): readonly Problem[] => [],
          onSome: (source) => commandProblems(entry, source),
        }),
      ),
    );
  const scanned = yield* Effect.forEach(pipe(listed, Arr.filter(isScanned)), problemsIn, {
    concurrency: READ_CONCURRENCY,
  });
  const present = yield* Effect.filter(pipe(listed, Arr.filter(isPython)), ({ file }) =>
    files.exists(file),
  );
  return [...pipe(present, Arr.map(fileProblem)), ...Arr.flatten(scanned)];
});

export { checkPython };
