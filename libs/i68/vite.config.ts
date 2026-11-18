import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
      verify: { command: [], dependsOn: ["test", "build"] },
    },
  },
  pack: {
    entry: {
      index: "src/app/index.ts",
      cli: "bin/i68.ts",
      vite: "src/app/vite.ts",
    },
    platform: "node",
    sourcemap: true,
    deps: { alwaysBundle: ["@masseater.dev/lint-host"] },
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
