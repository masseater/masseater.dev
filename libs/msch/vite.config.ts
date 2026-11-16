import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "270 MB" },
    lint: {
      overrides: [
        {
          files: ["src/app/oxlint.ts"],
          rules: {
            "node/no-sync": "off",
            "effecttsgo/node-builtin-import": "off",
            "effecttsgo/schema-sync": "off",
          },
        },
        {
          files: ["src/features/comments/model/comments.ts"],
          rules: { "effecttsgo/node-builtin-import": "off" },
        },
      ],
    },
  },
  plugins: [otlp()],
  resolve: {
    dedupe: ["vitest"],
  },
  pack: {
    entry: {
      cli: "bin/msch.ts",
      oxlint: "src/app/oxlint.ts",
      lint: "src/features/lint-preset/index.ts",
      "decision-rules": "src/app/decision-rules.ts",
      "lint-rules": "src/features/lint-rules/index.ts",
      "workspace-settings": "src/features/workspace-settings/index.ts",
    },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  test: {
    testTimeout: 30_000,
    server: {
      deps: {
        inline: ["@effect/vitest"],
      },
    },
  },
  run: {
    tasks: {
      test: "vp test run",
      verify: { command: [], dependsOn: ["build"] },
      build: "vp pack",
    },
  },
});
