import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      ignorePatterns: ["src/shared/data/**", "src/**/fixtures/**"],
    },
  },
  run: {
    tasks: {
      test: { command: "vp test run", dependsOn: ["@r_masseater/fu4#native"], cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
      "generate-data": { command: "node bin/generate-data.ts", cache: false },
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "node",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
