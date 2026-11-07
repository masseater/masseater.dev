import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      eval: {
        command: "node src/main.ts",
        cache: false,
      },
    },
  },
});
