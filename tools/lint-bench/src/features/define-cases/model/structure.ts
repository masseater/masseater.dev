import { Array as Arr, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { caseOf } from "#/entities/bench/index.ts";
import type { Case, Context, Tool } from "#/entities/bench/index.ts";
import { containing, fromJson, indexKeys, linesOf, orNone } from "#/shared/lib/findings.ts";

const SOURCES = "$(ls -d apps/*/src libs/*/src tools/*/src)";

const LAYERS = '["app", "pages", "widgets", "features", "entities", "shared"]';

const FSD_SCOPE = "FSD layer imports in apps/*/src, libs/*/src and tools/*/src";

const npmBin = (context: Context, name: string): string => `${context.npm}/.bin/${name}`;

const CruiseSummary = Schema.Struct({ violations: Schema.Array(Schema.Unknown) });

const Cruise = Schema.Struct({ summary: CruiseSummary });

const EslintFile = Schema.Struct({ messages: Schema.Array(Schema.Unknown) });

const EslintReport = Schema.Array(EslintFile);

const cruiseKeys = fromJson(Schema.decodeUnknownOption(Cruise))((cruise) =>
  indexKeys(cruise.summary.violations),
);

const eslintKeys = fromJson(Schema.decodeUnknownOption(EslintReport))((files) =>
  indexKeys(
    pipe(
      files,
      Arr.flatMap((file) => file.messages),
    ),
  ),
);

const depcruiseConfig = `const ws = "^(apps|libs|tools)/[^/]+/src/";
const layers = ${LAYERS};
module.exports = {
  forbidden: [
    ...layers.slice(1).map((layer, index) => ({
      name: "fsd-" + layer,
      severity: "error",
      from: { path: "(" + ws + ")" + layer + "/" },
      to: { path: "^$1(" + layers.join("|") + ")/", pathNot: "^$1(" + layers.slice(index + 1).join("|") + ")/" },
    })),
    { name: "fsd-cross-slice", severity: "error", from: { path: "(" + ws + ")(entities|features|widgets|pages)/([^/]+)/" }, to: { path: "^$1$2/", pathNot: "^$1$2/$3/" } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(node_modules|/dist/|\\\\.test\\\\.)" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "node", "default", "types"], extensions: [".ts", ".tsx", ".js", ".mjs", ".d.ts"] },
  },
};
`;

const steigerConfig = `import fsd from "@feature-sliced/steiger-plugin";
export default [...fsd.configs.recommended];
`;

const eslintConfig = (
  npm: string,
): string => `import boundaries from "${npm}/eslint-plugin-boundaries/dist/index.js";
import parser from "${npm}/@typescript-eslint/parser/dist/index.js";
const layers = ${LAYERS};
export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/*.gen.ts", "**/*.test.ts"] },
  {
    files: ["*/*/src/**/*.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { boundaries },
    settings: {
      "boundaries/elements": layers.map((type) => ({ type, pattern: "*/*/src/" + type, capture: ["group", "ws"] })),
      "import/resolver": { typescript: { project: ["*/*/tsconfig.json"], noWarnOnMultipleProjects: true } },
    },
    rules: {
      "boundaries/dependencies": [2, {
        default: "allow",
        policies: layers.map((type, index) => ({
          from: { element: { type } },
          disallow: { to: { element: { types: layers.slice(0, index), captured: { group: "{{ from.element.captured.group }}", ws: "{{ from.element.captured.ws }}" } } } },
        })),
      }],
    },
  },
];
`;

const sheriffConfig = `import { execSync } from "node:child_process";
const files = execSync("git ls-files '*/*/src/app/*.ts' '*/*/src/app/*.tsx'", { encoding: "utf8" })
  .split("\\n")
  .filter((file) => file !== "" && !/\\.test\\.|\\.d\\.ts$|\\.gen\\./u.test(file)
});
const layers = ${LAYERS};
export const config = {
  entryPoints: Object.fromEntries(files.map((file) => [file, file])),
  enableBarrelLess: true,
  modules: { "<group>/<ws>/src/<layer>": ["layer:<layer>"] },
  depRules: {
    root: "*",
    noTag: "*",
    ...Object.fromEntries(layers.map((layer, index) => ["layer:" + layer, [...layers.slice(index).map((lower) => "layer:" + lower), "noTag"]])),
  },
};
`;

const lsLintConfig = `ls:
  "{apps,libs,tools}/*/src":
    .dir: kebab-case | snake_case
    .ts: kebab-case
    .tsx: kebab-case | PascalCase
    .rs: snake_case
ignore:
  - .git
  - node_modules
  - target
  - "{apps,libs,tools}/*/node_modules"
  - "{apps,libs,tools}/*/target"
`;

export const structureConfig = {
  "depcruise.cjs": depcruiseConfig,
  "steiger.config.mjs": steigerConfig,
};

const INDENTED = /^\s{2,}\S/u;

const failed = Predicate.not(Str.includes("All projects validated successfully"));

const sheriffFindings = (text: string): readonly string[] =>
  orNone(
    pipe(
      Option.liftPredicate(text, failed),
      Option.map((output) => Arr.filter(linesOf(output), (line) => INDENTED.test(line))),
    ),
  );

const TOOLS: readonly Tool[] = [
  {
    tool: "wism",
    version: "workspace",
    own: true,
    scope:
      "The repository's own config: placement, FSD layers and imports of TS, Rust and Markdown",
    repositoryRoot: true,
    command: (context) => `node ${context.bins["wism"] ?? ""}`,
    findings: containing(":"),
  },
  {
    tool: "dependency-cruiser",
    version: "18.8.0",
    own: false,
    scope: FSD_SCOPE,
    repositoryRoot: true,
    command: (context) =>
      `${npmBin(context, "depcruise")} --config ${context.config["depcruise.cjs"] ?? ""} -T json ${SOURCES}`,
    findings: cruiseKeys,
  },
  {
    tool: "eslint-plugin-boundaries",
    version: "7.4.4 on ESLint 10.15.0",
    own: false,
    scope: FSD_SCOPE,
    repositoryRoot: true,
    files: (context) => ({ "eslint.lint-bench.mjs": eslintConfig(context.npm) }),
    command: (context) =>
      `${npmBin(context, "eslint")} --no-config-lookup -c eslint.lint-bench.mjs -f json --report-unused-disable-directives-severity off '*/*/src/**/*.{ts,tsx}'`,
    findings: eslintKeys,
  },
  {
    tool: "Sheriff",
    version: "0.20.0",
    own: false,
    scope: `${FSD_SCOPE}, from every file in src/app`,
    repositoryRoot: true,
    files: () => ({ "sheriff.config.ts": sheriffConfig }),
    command: (context) => `${npmBin(context, "sheriff")} verify`,
    findings: sheriffFindings,
  },
  {
    tool: "steiger",
    version: "0.10.0, @feature-sliced/steiger-plugin 0.8.2",
    own: false,
    scope: "FSD recommended rules, one run per src directory",
    repositoryRoot: true,
    command: (context) =>
      `for source in ${SOURCES}; do ${npmBin(context, "steiger")} "$source" --config ${context.config["steiger.config.mjs"] ?? ""} --reporter json; done`,
    findings: containing('"ruleName"'),
  },
  {
    tool: "ls-lint",
    version: "2.3.2",
    own: false,
    scope: "File and directory names in apps/*/src, libs/*/src and tools/*/src",
    repositoryRoot: true,
    files: () => ({ ".ls-lint.yml": lsLintConfig }),
    command: (context) => npmBin(context, "ls-lint"),
    findings: containing("failed for"),
  },
];

export const structureCases: readonly Case[] = pipe(
  TOOLS,
  Arr.map(caseOf({ family: "structure", corpus: "masseater.dev" })),
);
