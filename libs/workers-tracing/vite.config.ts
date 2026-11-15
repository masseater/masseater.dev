import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "0 B" },
    devDependencies: {
      "Workers のスパンは Miniflare で Worker を動かしてテストする": {
        dependencies: ["miniflare"],
      },
    },
    lint: {
      overrides: [
        {
          files: ["src/**/*.test.ts"],
          use: ["otlpInterop"],
        },
      ],
    },
  },
  run: {
    tasks: {
      test: "vp test run",
      build: "vp pack",
    },
  },
  plugins: [otlp()],
  pack: {
    entry: {
      alchemy: "src/alchemy.ts",
      "browser-spans": "src/browser-spans.ts",
      effect: "src/effect.ts",
      "effect.plain": "src/effect.plain.ts",
      elysia: "src/elysia.ts",
      "elysia.plain": "src/elysia.plain.ts",
      oxlint: "src/oxlint.ts",
      "tanstack-start": "src/tanstack-start.ts",
      "tanstack-start.plain": "src/tanstack-start.plain.ts",
      traces: "bin/workers-traces.ts",
      "trace-sink.worker": "src/trace-sink.worker.ts",
      "workers-ai": "src/workers-ai.ts",
    },
    platform: "neutral",
    sourcemap: true,
    publint: { strict: true },
    attw: {
      module: { checkPackage, createPackageFromTarballData },
      profile: "esm-only",
      level: "error",
    },
    dts: true,
    external: [
      /^cloudflare:/u,
      /^node:/u,
      /^alchemy/u,
      /^@alchemy\.run\//u,
      /^@distilled\.cloud\//u,
      /^@effect\/platform-node/u,
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/fixture/**"],
    testTimeout: 60_000,
  },
});
