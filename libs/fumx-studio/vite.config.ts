import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { OTEL_ENV, lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: { ...LOCKED, untrackedEnv: OTEL_ENV } },
      verify: { command: [], dependsOn: ["test"] },
    },
  },
  plugins: [lapse(), otlp()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
