import tanstackQuery from "@r_masseater/oxlint-typed-rules/tanstack-query";
import tanstackRouter from "@r_masseater/oxlint-typed-rules/tanstack-router";
import { plugin as shadcn } from "@shadcn/lint";
import baselineJs from "eslint-plugin-baseline-js";
import {
  allRulesOf,
  decisionPluginName,
  decisionRules,
  decisionTestRules,
  generated,
  pluginRules,
  restrictedImports,
  shadcnRestyleContracts,
} from "oxlint-masseater-plugin";
import {
  alchemyOverride,
  otlpInteropOverride,
  otlpLibOverrides,
  pluginEntryOverrides,
  scriptsOverride,
  workerOverride,
  writerOnlyOverride,
} from "oxlint-masseater-plugin/lint-overrides";
import { readonlyParameterAllow } from "oxlint-masseater-plugin/readonly-types";
import { defineConfig } from "vite-plus";

import { checks, checkTasks, packageChecks } from "./checks.config.ts";

const typedRules = "@r_masseater/oxlint-typed-rules";

export default defineConfig({
  ...checks,
  test: {
    projects: [
      "apps/*",
      "libs/*",
      "infra/*",
      "tools/*",
      "!apps/zenn-articles",
      "!tools/mosaic",
      "!tools/seikin-dance",
    ],
    passWithNoTests: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: generated,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
  },
  lint: {
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
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "tanstack-query", specifier: `${typedRules}/tanstack-query` },
      { name: "tanstack-router", specifier: `${typedRules}/tanstack-router` },
      { name: "tanstack-start", specifier: `${typedRules}/tanstack-start` },
      { name: "drizzle", specifier: `${typedRules}/drizzle` },
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      { name: "@eslint-react", specifier: `${typedRules}/react` },
      { name: "shadcn", specifier: "@shadcn/lint" },
      { name: "no-comments", specifier: "eslint-plugin-no-comments" },
      { name: "baseline-js", specifier: "eslint-plugin-baseline-js" },
      { name: "@html-eslint/react", specifier: "@html-eslint/eslint-plugin-react" },
      { name: "eslint-js", specifier: "oxlint-plugin-eslint" },
      { name: decisionPluginName, specifier: "oxlint-masseater-plugin/decision-rules" },
    ],
    rules: {
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
          ignoreFeatures: ["webgpu"],
        },
      ],
      ...pluginRules,
      "eslint/sort-imports": "off",
      "eslint/sort-keys": "off",
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "import/no-namespace": ["error", { ignore: ["linguist-languages"] }],
      "react/react-in-jsx-scope": "off",
      "eslint/no-undef": "off",
      "typescript/promise-function-async": "off",
      "react/forbid-component-props": "off",
      "oxc/no-rest-spread-properties": "off",
      "node/no-top-level-await": "off",
      "eslint/one-var": ["error", "never"],
      "eslint/id-length": ["error", { exceptions: ["x", "y"] }],
      "eslint/no-restricted-imports": ["error", restrictedImports],
      "typescript/prefer-readonly-parameter-types": [
        "error",
        {
          ignoreInferredTypes: true,
          allow: readonlyParameterAllow,
        },
      ],
      "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
      ],
      "eslint/new-cap": [
        "error",
        {
          capIsNewExceptions: [
            "App",
            "Build",
            "CloudflareApiLive",
            "Repository",
            "RepositorySettings",
            "Resource",
            "Ruleset",
            "Secret",
            "Stack",
          ],
          capIsNewExceptionPattern: String.raw`^(Argument|Config|Containers|Context|Data|Flag|Persistable|Schema|AnalyticsEngine|ApiToken|D1|KV|Logpush|R2|Ruleset|Rules|SecretsStore|Website|Workers|Zone)\.`,
        },
      ],
      "typescript/no-empty-interface": ["error", { allowSingleExtends: true }],
      "typescript/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/only-export-components": ["error", { allowExportNames: ["Route"] }],
    },
    overrides: [
      alchemyOverride,
      {
        files: ["**/*.config.ts", "**/alchemy.*.ts", "**/*.worker.ts", "**/decision-rules.ts"],
        rules: { "import/no-default-export": "off" },
      },
      {
        files: ["**/shared/ui/**", "libs/ui/src/{badge,button}.tsx", "libs/web-ui/src/ui/**"],
        rules: { "shadcn/no-restyle": "off", "react/jsx-props-no-spreading": "off" },
      },
      {
        files: ["apps/portfolio/src/**/*.{ts,tsx}"],
        rules: decisionRules,
      },
      workerOverride,
      writerOnlyOverride,
      {
        files: ["apps/aredoko-server/src/app/**"],
        rules: { "import/no-nodejs-modules": ["error", { allow: ["node:worker_threads"] }] },
      },
      scriptsOverride,
      ...pluginEntryOverrides,
      otlpInteropOverride,
      ...otlpLibOverrides,
      {
        files: ["**/*.test.ts"],
        rules: decisionTestRules,
      },
    ],
    settings: {
      [decisionPluginName]: { model: "openrouter/typesafe/jev-1.14" },
    },
    options: {
      typeAware: true,
      typeCheck: true,
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  run: {
    cache: true,
    tasks: {
      ...checkTasks,
      renovate: "renovate-config-validator --strict",
      fallow: [
        "fallow --skip dupes --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --quiet --format json | jq -e '[.prop_drilling_chains, .thin_wrappers, .duplicate_prop_shapes] | all(length == 0)' > /dev/null",
        "fallow dupes --fail-on-issues --quiet --format compact",
        "fallow security --fail-on-issues --quiet",
      ],
      "actions-lint": {
        command:
          'vpa actionlint && vpa zizmor $(test -n "$CLAUDE_CODE_REMOTE" && echo --no-online-audits) .github && ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows',
        cache: {
          env: ["CLAUDE_CODE_REMOTE"],
          untrackedEnv: [
            "GH_TOKEN",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
          ],
        },
      },
      verify: {
        command: "vp check --deny-warnings",
        cache: {
          env: ["OPENROUTER_API_KEY"],
          untrackedEnv: [
            "CLAUDECODE",
            "CLAUDE_CODE_REMOTE",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
            "NODE_EXTRA_CA_CERTS",
          ],
        },
        dependsOn: [
          "test",
          "dependency-rules",
          "markdown-lint",
          "renovate",
          "actions-lint",
          "steiger",
          "db-check-all",
          "fallow",
          "msch",
          "betterleaks",
          "ignored-sources",
          "audit",
          ...packageChecks,
        ],
      },
      test: "vp test run",
      msch: {
        command: "node tools/msch/src/cli.ts",
        cache: {
          untrackedEnv: ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", "SSL_CERT_FILE"],
        },
      },
      "db-check-all": "vp run -r db:check",
      audit: {
        command:
          'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi',
        cache: false,
      },
      "ignored-sources": {
        command: String.raw`ignored="$(git ls-files --others --ignored --exclude-standard -- ":(glob)**/src/**" ":(exclude,glob)**/node_modules/**")"; if [ -n "$ignored" ]; then printf "%s\n" "$ignored" >&2; echo "These files under src/ are ignored by .gitignore, so verify passes here but they never reach the commit. Narrow the pattern in .gitignore." >&2; exit 1; fi`,
        cache: false,
      },
    },
  },
});
