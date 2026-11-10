import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
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
      build: { command: "vp pack", cache: false },
    },
  },
});
