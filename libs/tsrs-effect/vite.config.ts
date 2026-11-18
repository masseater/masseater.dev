import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: [], dependsOn: ["test"] },
      native: { command: "node bin/build.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
