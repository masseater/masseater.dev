import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "13 MB" },
    lint: { ignorePatterns: ["example/**"] },
  },
  pack: {
    entry: [
      "src/app/index.ts",
      "src/app/openrouter-app.ts",
      "src/app/openrouter-worker.ts",
      "src/app/cloudflare-worker.ts",
    ],
    platform: "node",
    sourcemap: true,
    deps: { resolveDepSubpath: true },
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    testTimeout: 120_000,
  },
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["test"] },
      build: "vp pack",
      test: { command: "vp test run --exclude='src/*live.test.ts'", dependsOn: ["build"] },
      "test:live": { command: "vp test run live.test", dependsOn: ["build"], cache: false },
    },
  },
});
