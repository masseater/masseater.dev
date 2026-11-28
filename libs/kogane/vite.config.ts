import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [lapse()],
  pack: {
    entry: { main: "src/app/main.ts" },
    platform: "node",
    publint: { strict: true },
  },
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
});
