import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "140 MB" },
    lint: {
      overrides: [
        {
          files: ["src/oxlint.ts"],
          rules: {
            "node/no-sync": "off",
            "effecttsgo/node-builtin-import": "off",
            "effecttsgo/schema-sync": "off",
          },
        },
        {
          files: ["src/comments.ts"],
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
      cli: "src/cli.ts",
      oxlint: "src/oxlint.ts",
      lint: "src/lint/index.ts",
      "decision-rules": "src/lint/decision-rules.ts",
      "workspace-settings": "src/workspace-settings.ts",
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
      "npm:publish": {
        command: "node ../../tools/npm-publish/src/main.ts",
        dependsOn: ["test", "build"],
        cache: false,
      },
      verify: { command: [], dependsOn: ["build"] },
      build: "vp pack",
    },
  },
});
