import { fileURLToPath } from "node:url";

import tanstackQuery from "@r_masseater/oxlint-typed-rules/tanstack-query";
import tanstackRouter from "@r_masseater/oxlint-typed-rules/tanstack-router";
import { plugin as shadcn } from "@shadcn/lint";
import baselineJs from "eslint-plugin-baseline-js";
import type { UserConfig } from "vite-plus";

import decisionPlugin from "./decision-rules.ts";
import { alchemyOverride, scriptsOverride } from "./lint-overrides.config.ts";
import {
  allRulesOf,
  decisionPluginName,
  generated,
  pluginRules,
  restrictedImports,
  shadcnRestyleContracts,
} from "./lint.config.ts";
import { readonlyParameterAllow } from "./readonly-types.config.ts";

type LintConfig = NonNullable<UserConfig["lint"]>;

const resolved = (specifier: string): string => fileURLToPath(import.meta.resolve(specifier));

const typedRules = "@r_masseater/oxlint-typed-rules";

const jsPlugins = [
  { name: "vite-plus", specifier: resolved("vite-plus/oxlint-plugin") },
  { name: "tanstack-query", specifier: resolved(`${typedRules}/tanstack-query`) },
  { name: "tanstack-router", specifier: resolved(`${typedRules}/tanstack-router`) },
  { name: "tanstack-start", specifier: resolved(`${typedRules}/tanstack-start`) },
  { name: "drizzle", specifier: resolved(`${typedRules}/drizzle`) },
  { name: "react-hooks-js", specifier: resolved("eslint-plugin-react-hooks") },
  { name: "@eslint-react", specifier: resolved(`${typedRules}/react`) },
  { name: "shadcn", specifier: resolved("@shadcn/lint") },
  { name: "no-comments", specifier: resolved("eslint-plugin-no-comments") },
  { name: "baseline-js", specifier: resolved("eslint-plugin-baseline-js") },
  { name: "@html-eslint/react", specifier: resolved("@html-eslint/eslint-plugin-react") },
  { name: "eslint-js", specifier: resolved("oxlint-plugin-eslint") },
  { name: decisionPluginName, specifier: resolved("@r_masseater/msch/decision-rules") },
];

const rules = {
  "vite-plus/prefer-vite-plus-imports": "error",
  "tanstack-start/no-async-client-component": "error",
  "tanstack-start/no-client-code-in-server-component": "error",
  "no-comments/disallowComments": [
    "error",
    {
      allow: [
        "oxlint-disable",
        "eslint-disable",
        String.raw`\* @internal \*?$`,
        String.raw`\* @msch \S+ \*?$`,
        "/usr/bin/env node$",
      ],
    },
  ],
  ...allRulesOf({ prefix: "tanstack-query", rules: tanstackQuery.rules }),
  ...allRulesOf({ prefix: "tanstack-router", rules: tanstackRouter.rules }),
  "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db"] }],
  "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db"] }],
  ...allRulesOf({ prefix: "shadcn", rules: shadcn.rules }),
  "shadcn/no-restyle": ["error", { contracts: shadcnRestyleContracts }],
  ...allRulesOf({ prefix: "baseline-js", rules: baselineJs.rules }),
  ...baselineJs.configs.recommended().rules,
  "baseline-js/use-baseline": [
    "error",
    {
      available: "widely",
      includeWebApis: { preset: "auto" },
      includeJsBuiltins: { preset: "auto" },
    },
  ],
  ...pluginRules,
  "eslint/sort-imports": "off",
  "eslint/sort-keys": "off",
  "import/no-named-export": "off",
  "import/prefer-default-export": "off",
  "react/react-in-jsx-scope": "off",
  "eslint/no-undef": "off",
  "typescript/promise-function-async": "off",
  "react/forbid-component-props": "off",
  "oxc/no-rest-spread-properties": "off",
  "node/no-top-level-await": "off",
  "eslint/one-var": ["error", "never"],
  "eslint/id-length": ["error", { exceptions: ["x", "y"] }],
  "jsdoc/check-tag-names": ["error", { definedTags: ["msch"] }],
  "eslint/no-restricted-imports": ["error", restrictedImports],
  "typescript/prefer-readonly-parameter-types": [
    "error",
    { ignoreInferredTypes: true, allow: readonlyParameterAllow },
  ],
  "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
  "react/function-component-definition": [
    "error",
    { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
  ],
  "typescript/no-empty-interface": ["error", { allowSingleExtends: true }],
  "typescript/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
  "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
  "react/only-export-components": ["error", { allowExportNames: ["Route"] }],
} satisfies LintConfig["rules"];

const overrides = [
  alchemyOverride,
  {
    files: ["**/*.config.ts", "**/alchemy.*.ts", "**/*.worker.ts", "**/decision-rules.ts"],
    rules: { "import/no-default-export": "off" },
  },
  scriptsOverride,
  {
    files: ["**/vite.config.ts"],
    rules: { "eslint/max-lines": "off" },
  },
] satisfies LintConfig["overrides"];

const lint = {
  ignorePatterns: generated,
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "react",
    "react-perf",
    "jsx-a11y",
    "jsdoc",
    "promise",
    "node",
    "effecttsgo",
  ],
  categories: {
    correctness: "error",
    suspicious: "error",
    pedantic: "error",
    perf: "error",
    style: "error",
    restriction: "error",
    nursery: "error",
  },
  jsPlugins,
  rules,
  overrides,
  settings: {
    [decisionPlugin.meta.name]: { model: "openrouter/typesafe/jev-1.14" },
  },
  options: {
    typeAware: true,
    typeCheck: true,
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
  },
} satisfies LintConfig;

export { lint };
