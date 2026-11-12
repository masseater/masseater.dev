import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: true },
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
    include: ["tests/**/*.test.ts"],
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
      test: {
        command: "vp test run --exclude='tests/*live.test.ts'",
        dependsOn: ["build", "@r_masseater/oxlint-plugin-decision#build"],
      },
      "test:live": {
        command: "vp test run live.test",
        dependsOn: ["build", "@r_masseater/oxlint-plugin-decision#build"],
        cache: false,
      },
    },
  },
});
