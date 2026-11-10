import { defineConfig } from "vite-plus";

const liveTests = ["tests/live.test.ts", "tests/claims-live.test.ts", "tests/ai-slop-live.test.ts"];

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/recommended.ts",
      "src/strict.ts",
      "src/review-only.ts",
      "src/ai-slop.ts",
    ],
    platform: "node",
    sourcemap: true,
    tsconfig: "tsconfig.build.json",
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    testTimeout: 120_000,
    projects: [
      {
        extends: true,
        test: {
          name: "mock",
          include: ["tests/**/*.test.ts"],
          exclude: liveTests,
        },
      },
      {
        extends: true,
        test: {
          name: "live",
          include: liveTests,
        },
      },
    ],
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
      test: { command: "vp test run --project=mock", dependsOn: ["build"] },
      "test:live": { command: "vp test --project=live", dependsOn: ["build"], cache: false },
    },
  },
});
