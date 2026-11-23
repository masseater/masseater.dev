import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: {
        command: "vp test run",
        dependsOn: ["@r_masseater/y8#native"],
        cache: LOCKED,
      },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "neutral",
    sourcemap: true,
    publint: { strict: true },
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
