import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      native: {
        command: "node bin/build.ts",
        cache: {
          input: ["package.json", "bin/build.ts", "patches/**", "src/**"],
          output: ["native/**"],
          env: ["OS"],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
