import { checkPackage, createPackageFromTarballData } from "@r_masseater/vite-plus-adopt/attw";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
  plugins: [otlp()],
  pack: {
    entry: [
      "src/alchemy.ts",
      "src/browser-spans.ts",
      "src/effect.ts",
      "src/effect.plain.ts",
      "src/elysia.ts",
      "src/elysia.plain.ts",
      "src/oxlint.ts",
      "src/tanstack-start.ts",
      "src/tanstack-start.plain.ts",
      "src/traces.ts",
      "src/trace-sink.worker.ts",
      "src/workers-ai.ts",
    ],
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
