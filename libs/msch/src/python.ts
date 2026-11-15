import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "./problem.ts";
import {
  isScannedText,
  isToolVersions,
  listedFiles,
  presentFiles,
  scanText,
} from "./scanned-files.ts";
import type { Listed } from "./scanned-files.ts";
import { positionOf } from "./text-position.ts";

const PYTHON_FILE =
  /(?:\.(?:py|pyi|pyw|pyx|ipynb)|(?:^|\/)(?:pyproject\.toml|uv\.lock|uv\.toml|poetry\.lock|Pipfile|Pipfile\.lock|setup\.cfg|tox\.ini|pytest\.ini|\.python-version|requirements[^/]*\.txt))$/u;

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

const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const WHOLE_MATCH = 0;
const FILE_RULE: RuleName = "python-file";
const COMMAND_RULE: RuleName = "python-command";

const fileProblem = ({ file }: Listed): Problem => ({
  file,
  line: FIRST_LINE,
  column: FIRST_COLUMN,
  rule: FILE_RULE,
  message: "Python is not used in this repository. Replace this file with TypeScript or Rust.",
});

const patternsFor = (entry: Listed): readonly RegExp[] => {
  if (isToolVersions(entry)) {
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
    patternsFor(entry),
    Arr.flatMap((pattern) => Arr.fromIterable(Str.matchAll(pattern)(source))),
    Arr.map(commandProblem(entry, source)),
  );

const isPython = ({ name }: Listed): boolean => PYTHON_FILE.test(name);

const isScanned = (entry: Listed): boolean => !isPython(entry) && isScannedText(entry);

/** @internal */
const checkPython = Effect.fn("checkPython")(function* checkPython(root: string) {
  const listed = yield* listedFiles(root);
  const scanned = yield* scanText(pipe(listed, Arr.filter(isScanned)), commandProblems);
  const present = yield* presentFiles(pipe(listed, Arr.filter(isPython)));
  return [...pipe(present, Arr.map(fileProblem)), ...scanned];
});

export { checkPython };
