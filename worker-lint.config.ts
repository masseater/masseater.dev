import {
  restrictedImports as untracedImports,
  restrictedProperties as untracedProperties,
} from "@r_masseater/workers-tracing/oxlint";

import { restrictedImports } from "./lint.config.ts";

const workerOverride: {
  files: string[];
  excludeFiles: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
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
};

export { workerOverride };
