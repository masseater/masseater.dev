import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: "vp test run",
      build: "vp pack",
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
