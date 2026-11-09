import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp()],
  resolve: {
    dedupe: ["vitest"],
  },
  test: {
    server: {
      deps: {
        inline: ["@effect/vitest"],
      },
    },
  },
});
