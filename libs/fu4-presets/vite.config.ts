import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", dependsOn: ["@r_masseater/fu4#native"] },
      build: "vp pack",
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "node",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
