import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "0 B" } },
  pack: {
    entry: { main: "src/main.ts" },
    platform: "node",
    deps: { alwaysBundle: [/./u], onlyBundle: false },
    publint: { strict: true },
  },
  test: {
    testTimeout: 60_000,
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
    },
  },
});
