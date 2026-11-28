import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    publish: { installSize: "96 MB" },
  },
  pack: {
    entry: { main: "src/app/main.ts" },
    platform: "node",
    deps: { alwaysBundle: [/./u], onlyBundle: false },
    publint: { strict: true },
  },
  plugins: [lapse()],
  test: {
    testTimeout: 60_000,
  },
  run: {
    tasks: {
      test: {
        command: "vp test run",
        dependsOn: [{ task: "native", from: "dependencies" }],
        cache: LOCKED,
      },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
});
