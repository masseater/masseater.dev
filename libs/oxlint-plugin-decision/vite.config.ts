import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "13 MB" },
    lint: { ignorePatterns: ["example/**", "example-presets/**"] },
  },
  pack: {
    entry: {
      index: "src/index.ts",
      "openrouter-app": "src/openrouter-app.ts",
      "openrouter-worker": "src/openrouter-worker.ts",
      "cloudflare-worker": "src/cloudflare-worker.ts",
      "presets/index": "src/presets/index.ts",
      "presets/recommended": "src/presets/recommended.ts",
      "presets/strict": "src/presets/strict.ts",
      "presets/review-only": "src/presets/review-only.ts",
      "presets/ai-slop": "src/presets/ai-slop.ts",
    },
    platform: "node",
    sourcemap: true,
    deps: { resolveDepSubpath: true },
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    testTimeout: 120_000,
    include: ["src/**/*.test.ts"],
  },
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["test"] },
      build: "vp pack",
      test: { command: "vp test run --exclude='src/**/*live.test.ts'", dependsOn: ["build"] },
      "test:live": { command: "vp test run live.test", dependsOn: ["build"], cache: false },
    },
  },
});
