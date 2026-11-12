import {
  INFRASTRUCTURE,
  INSTRUMENTATION,
  decisionRules,
  decisionTestRules,
  generated,
  lint as preset,
  restrictedImports,
} from "@r_masseater/msch/lint";
import {
  restrictedImports as untracedImports,
  restrictedProperties as untracedProperties,
  restrictedSyntax as unguardedWorkersAi,
} from "@r_masseater/workers-tracing/oxlint";
import { Array as Arr, pipe } from "effect";
import type { UserConfig } from "vite-plus";

type LintConfig = NonNullable<UserConfig["lint"]>;

const WRITE_THROUGH_WRITER =
  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため";

const isOtlpInterop = ({ message }: Readonly<{ message: string }>): boolean =>
  message !== INSTRUMENTATION && message !== INFRASTRUCTURE;

const otlpInteropImports = {
  paths: pipe(restrictedImports.paths, Arr.filter(isOtlpInterop)),
  patterns: pipe(restrictedImports.patterns, Arr.filter(isOtlpInterop)),
};

const overrides = [
  {
    files: ["**/shared/ui/**", "libs/ui/src/{badge,button}.tsx", "libs/web-ui/src/ui/**"],
    rules: { "shadcn/no-restyle": "off", "react/jsx-props-no-spreading": "off" },
  },
  {
    files: ["apps/portfolio/src/**/*.{ts,tsx}"],
    rules: decisionRules,
  },
  {
    files: [
      "apps/portfolio/worker/**/*.ts",
      "apps/portfolio/src/**/*.server.ts",
      "infra/repositories/*.worker.ts",
    ],
    excludeFiles: ["**/*.test.ts"],
    rules: {
      "eslint/no-restricted-imports": [
        "error",
        { ...restrictedImports, paths: [...restrictedImports.paths, ...untracedImports] },
      ],
      "eslint/no-restricted-properties": ["error", ...untracedProperties],
    },
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "apps/*/worker/**/*.ts"],
    excludeFiles: ["**/*.test.ts"],
    rules: { "eslint-js/no-restricted-syntax": ["error", ...unguardedWorkersAi] },
  },
  {
    files: ["apps/watashi-mcp/src/**/*.{ts,tsx}"],
    excludeFiles: ["apps/watashi-mcp/src/features/mcp/api/*-writer.server.ts"],
    rules: {
      "eslint/no-restricted-properties": [
        "error",
        { object: "db", property: "insert", message: WRITE_THROUGH_WRITER },
        { object: "db", property: "update", message: WRITE_THROUGH_WRITER },
        { object: "db", property: "delete", message: WRITE_THROUGH_WRITER },
        { object: "db", property: "batch", message: WRITE_THROUGH_WRITER },
        { object: "db", property: "run", message: WRITE_THROUGH_WRITER },
      ],
    },
  },
  {
    files: ["apps/aredoko-server/src/app/**"],
    rules: { "import/no-nodejs-modules": ["error", { allow: ["node:worker_threads"] }] },
  },
  {
    files: ["apps/kikite/src/pages/interview/lib/screen-hold.ts"],
    rules: {
      "baseline-js/use-baseline": [
        "error",
        {
          available: "widely",
          includeWebApis: { preset: "auto" },
          includeJsBuiltins: { preset: "auto" },
          ignoreFeatures: ["screen-wake-lock"],
        },
      ],
    },
  },
  {
    files: ["apps/kikite/server/serve.ts", "libs/watashi-cli/src/callback-server.ts"],
    rules: {
      "import/no-nodejs-modules": ["error", { allow: ["node:http"] }],
      "effecttsgo/node-builtin-import": "off",
    },
  },
  {
    files: ["libs/msch/src/oxlint.ts"],
    rules: {
      "import/no-default-export": "off",
      "import/no-nodejs-modules": "off",
      "node/no-sync": "off",
      "effecttsgo/node-builtin-import": "off",
      "effecttsgo/schema-sync": "off",
    },
  },
  {
    files: ["libs/msch/src/lint/preset.ts"],
    rules: { "import/no-nodejs-modules": ["error", { allow: ["node:url"] }] },
  },
  {
    files: [
      "libs/textlint-rule-no-taigendome/src/index.ts",
      "libs/textlint-rule-yomiyasu/src/index.ts",
      "libs/oxlint-plugin-decision/src/index.ts",
      "libs/oxlint-plugin-decision-presets/src/*.ts",
      "libs/oxlint-typed-rules/src/{drizzle,react,remotion,tanstack-query,tanstack-router,tanstack-start,ts-compat}.ts",
      "libs/vite-plus-adopt/src/{attw/typescript,fsd,fsd-typescript}.ts",
    ],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["libs/vitest-otlp/src/**/*.test.ts", "libs/workers-tracing/src/**/*.test.ts"],
    rules: { "eslint/no-restricted-imports": ["error", otlpInteropImports] },
  },
  {
    files: [
      "libs/vitest-otlp/src/grpc.ts",
      "libs/vitest-otlp/src/forward.ts",
      "libs/vitest-otlp/src/workers.ts",
    ],
    rules: { "import/no-nodejs-modules": ["error", { allow: ["node:http2", "node:url"] }] },
  },
  {
    files: ["libs/workers-tracing/src/context.ts"],
    rules: { "import/no-nodejs-modules": ["error", { allow: ["node:async_hooks"] }] },
  },
  {
    files: ["libs/workers-tracing/src/**/*.test.ts"],
    rules: { "import/no-nodejs-modules": ["error", { allow: ["node:url"] }] },
  },
  {
    files: ["libs/vitest-otlp/src/setup.ts"],
    rules: {
      "node/no-process-env": "off",
      "baseline-js/use-baseline": ["error", { ignoreFeatures: ["top-level-await"] }],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: decisionTestRules,
  },
] satisfies LintConfig["overrides"];

const lint = {
  ...preset,
  ignorePatterns: [
    ...generated,
    ".claude/hooks/fallow-gate.sh",
    "tools/pod-rattle-parity/engine.gen.js",
    "libs/oxlint-typed-rules/upstream/src/__tests__/**",
    "libs/oxlint-typed-rules/upstream/react/**",
    "libs/oxlint-typed-rules/upstream/{tanstack-*,drizzle,remotion}/**",
    "libs/vite-plus-adopt/upstream/**",
    "libs/textlint-rule-yomiyasu/upstream/**",
    "libs/oxlint-plugin-decision*/example/**",
  ],
  rules: {
    ...preset.rules,
    "import/no-namespace": ["error", { ignore: ["linguist-languages"] }],
    "baseline-js/use-baseline": [
      "error",
      {
        available: "widely",
        includeWebApis: { preset: "auto" },
        includeJsBuiltins: { preset: "auto" },
        ignoreFeatures: ["webgpu"],
      },
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
  },
  overrides: [...preset.overrides, ...overrides],
} satisfies LintConfig;

export { lint };
