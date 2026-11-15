import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "111 MB" },
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
      verify: { command: [], dependsOn: ["build"] },
      build: { command: "vp pack", cache: false },
    },
  },
});
