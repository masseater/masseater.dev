import { defineConfig } from "vite-plus";

const liveTests = ["tests/live.test.ts"];

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/openrouter-app.ts", "src/openrouter-worker.ts"],
    platform: "node",
    sourcemap: true,
    deps: { resolveDepSubpath: true },
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    testTimeout: 120_000,
    projects: [
      { extends: true, test: { name: "mock", exclude: liveTests } },
      { extends: true, test: { name: "live", include: liveTests } },
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
