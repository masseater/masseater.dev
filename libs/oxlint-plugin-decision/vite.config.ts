import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "13 MB" },
    lint: { ignorePatterns: ["example/**"] },
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/openrouter-app.ts",
      "src/openrouter-worker.ts",
      "src/cloudflare-worker.ts",
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
      build: { command: "vp pack", cache: false },
      test: { command: "vp test run --exclude='tests/*live.test.ts'", dependsOn: ["build"] },
      "test:live": { command: "vp test run live.test", dependsOn: ["build"], cache: false },
    },
  },
});
