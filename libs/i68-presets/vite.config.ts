import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
      verify: { command: [], dependsOn: ["test", "build"] },
      "build-style-tables": { command: "node bin/build-style-tables.ts", cache: false },
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "neutral",
    sourcemap: true,
    publint: { strict: true },
    dts: { generator: "tsgo" },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
