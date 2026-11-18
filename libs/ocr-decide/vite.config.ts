import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "67 MB" } },
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
