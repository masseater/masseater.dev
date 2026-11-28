import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { OTEL_ENV, lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: { publish: { installSize: "67 MB" } },
  run: {
    tasks: {
      test: { command: "vp test run", cache: { ...LOCKED, untrackedEnv: OTEL_ENV } },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: {
    entry: ["src/app/index.ts"],
    platform: "neutral",
    sourcemap: true,
    dts: {
      generator: "tsgo",
    },
  },
  plugins: [lapse()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
