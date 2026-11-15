import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      eval: {
        command: "node bin/aredoko-search-eval.ts",
        cache: false,
      },
    },
  },
});
