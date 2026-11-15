import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "173 MB" } },
  run: {
    tasks: {
      test: "vp test run",
      build: "vp pack",
    },
  },
  plugins: [otlp()],
  pack: {
    entry: { main: "bin/web-vitals-flow.ts" },
    platform: "node",
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
