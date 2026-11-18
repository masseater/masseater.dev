import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "13 MB" },
    lint: { ignorePatterns: ["example/**", "example-presets/**"] },
  },
  pack: {
    entry: {
      index: "src/app/index.ts",
      "typesafe-worker": "src/app/typesafe-worker.ts",
      "cloudflare-worker": "src/app/cloudflare-worker.ts",
      "presets/index": "src/app/presets.ts",
      "presets/recommended": "src/app/recommended.ts",
      "presets/strict": "src/app/strict.ts",
      "presets/review-only": "src/app/review-only.ts",
      "presets/ai-slop": "src/app/ai-slop.ts",
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
      build: { command: "vp pack", cache: LOCKED },
      test: {
        command: "vp test run --exclude='src/**/*live.test.ts'",
        dependsOn: ["build"],
        cache: LOCKED,
      },
      "test:live": { command: "vp test run live.test", dependsOn: ["build"], cache: false },
    },
  },
});
