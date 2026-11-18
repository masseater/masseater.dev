import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
      grammar: "langium generate",
      "grammar:check": "langium generate && git diff --exit-code -- generated",
      verify: { command: [], dependsOn: ["grammar:check", "test", "build"] },
    },
  },
  pack: {
    entry: ["src/app/index.ts", "src/app/language.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
