import { defineConfig } from "vite-plus";

export default defineConfig({
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
