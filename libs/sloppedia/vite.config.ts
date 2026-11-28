import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { OTEL_ENV, lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: { ...LOCKED, untrackedEnv: OTEL_ENV } },
    },
  },
  plugins: [lapse()],
  test: { environment: "happy-dom" },
});
