import { pipe, Array as Arr } from "effect";

import { INFRASTRUCTURE, INSTRUMENTATION, restrictedImports } from "./lint.config.ts";

const alchemyOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/alchemy.run.ts"],
  rules: {
    "eslint-js/no-restricted-syntax": [
      "error",
      {
        selector: 'CallExpression[callee.name="Stack"]:not([arguments.0.name="APP_NAME"])',
        message: "スタック名には app-name.ts の APP_NAME を渡す",
      },
      {
        selector:
          'Program:not(:has(YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
        message:
          "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
      },
      {
        selector:
          'CallExpression[callee.name="Stack"] > .arguments:nth-child(3):not(:has(FunctionExpression > BlockStatement > ExpressionStatement:nth-last-child(2) > YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
        message:
          "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
      },
    ],
  },
};

const scriptsOverride: {
  files: string[];
  rules: Readonly<Record<string, "off">>;
} = {
  files: ["scripts/**"],
  rules: {
    "import/no-nodejs-modules": "off",
    "node/no-process-env": "off",
    "node/no-sync": "off",
    "effecttsgo/node-builtin-import": "off",
  },
};

const isOtlpInterop = ({ message }: Readonly<{ message: string }>): boolean =>
  message !== INSTRUMENTATION && message !== INFRASTRUCTURE;

const otlpInteropImports = {
  paths: pipe(restrictedImports.paths, Arr.filter(isOtlpInterop)),
  patterns: pipe(restrictedImports.patterns, Arr.filter(isOtlpInterop)),
};

const otlpInteropOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", typeof otlpInteropImports]>>;
} = {
  files: ["libs/vitest-otlp/src/**/*.test.ts", "libs/workers-tracing/src/**/*.test.ts"],
  rules: { "eslint/no-restricted-imports": ["error", otlpInteropImports] },
};

const otlpLibOverrides: {
  files: string[];
  rules: Readonly<Record<string, "off" | ["error", ...unknown[]]>>;
}[] = [
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
];

export { writerOnlyOverride } from "./record-lint.config.ts";
export { workerOverride } from "./worker-lint.config.ts";
export { alchemyOverride, otlpInteropOverride, otlpLibOverrides, scriptsOverride };
