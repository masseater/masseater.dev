import { Array as Arr, String as Str, pipe } from "effect";

import { casesOf } from "#/entities/bench/index.ts";
import type { Context, Tool } from "#/entities/bench/index.ts";
import { linesOf, matching } from "#/shared/lib/findings.ts";

const MARKDOWN = "git ls-files -z '*.md' | xargs -0";

const SCOPE = "Markdown files git tracks, markdownlint's default rules";

const y8Lines = matching(/^(?<path>\S+?):(?<line>\d+)(?::\d+)? \w+ markdownlint\/(?<rule>MD\d+) /u);

const markdownlintLines = matching(
  /^(?<path>\S+?):(?<line>\d+)(?::\d+)? (?:error|warning) (?<rule>MD\d+)\//u,
);

const rumdlLines = matching(/^(?<path>\S+?):(?<line>\d+):\d+: \[(?<rule>MD\d+)\]/u);

const remarkMessages = matching(
  /^(?<path>\S+) (?<line>\d+):\d+(?:-\d+:\d+)?\s+(?:warning|error)\s.*\s(?<rule>\S+)\s+remark-lint$/u,
);

const withPath =
  (path: string) =>
  (message: string): string =>
    `${path} ${Str.trim(message)}`;

const joinedWith =
  (path: string) =>
  (messages: readonly string[]): string =>
    pipe(messages, Arr.map(withPath(path)), Arr.join("\n"));

const NO_FINDINGS: readonly string[] = [];

const remarkFile = (block: string): readonly string[] =>
  Arr.match(linesOf(block), {
    onEmpty: () => NO_FINDINGS,
    onNonEmpty: ([path, ...messages]) => remarkMessages(joinedWith(path)(messages)),
  });

const remarkFindings = (text: string): readonly string[] =>
  pipe(Str.split(text, /\n\s*\n/u), Arr.flatMap(remarkFile));

export const markdownConfig = {
  "remarkrc.json": '{"plugins":["remark-preset-lint-recommended"]}',
  "markdownlint.json": "{}",
};

const npmBin = (context: Context, name: string): string => `${context.npm}/.bin/${name}`;

const TOOLS: readonly Tool[] = [
  {
    tool: "y8",
    version: "workspace",
    own: true,
    scope: SCOPE,
    command: (context) => `node ${context.bins["y8"] ?? ""}`,
    caches: (context) => [`${context.corpus}/node_modules/.cache/y8`],
    files: () => ({ "vite.config.mts": "export default { y8: {} };\n" }),
    findings: y8Lines,
    keys: "markdownlint",
  },
  {
    tool: "markdownlint-cli2",
    version: "0.24.1",
    own: false,
    scope: SCOPE,
    command: (context) =>
      `${MARKDOWN} ${npmBin(context, "markdownlint-cli2")} --config ${context.config["markdownlint.json"] ?? ""} 2>&1`,
    findings: markdownlintLines,
    keys: "markdownlint",
  },
  {
    tool: "rumdl",
    version: "0.3.4",
    own: false,
    scope: SCOPE,
    command: () => `${MARKDOWN} rumdl check --no-config --output-format concise`,
    caches: (context) => [`${context.corpus}/.rumdl_cache`],
    findings: rumdlLines,
    keys: "markdownlint",
  },
  {
    tool: "remark-lint",
    version: "remark-cli 12.0.1, remark-preset-lint-recommended 7.0.1",
    own: false,
    scope: "Markdown files git tracks, remark-preset-lint-recommended",
    command: (context) =>
      `${MARKDOWN} ${npmBin(context, "remark")} --rc-path ${context.config["remarkrc.json"] ?? ""} --no-stdout --quiet --no-color 2>&1 >/dev/null`,
    findings: remarkFindings,
  },
];

export const markdownCases = casesOf("markdown")(TOOLS);
