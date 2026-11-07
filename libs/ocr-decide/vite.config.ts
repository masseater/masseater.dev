import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
  pack: {
    entry: ["src/index.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
