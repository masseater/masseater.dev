import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { OTEL_ENV, lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "173 MB" } },
  run: {
    tasks: {
      test: { command: "vp test run", cache: { ...LOCKED, untrackedEnv: OTEL_ENV } },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  plugins: [lapse(), otlp()],
  pack: {
    entry: { main: "bin/web-vitals-flow.ts" },
    platform: "node",
    sourcemap: true,
    publint: { strict: true },
  },
  test: {
    include: ["src/**/*.test.ts", "bin/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
