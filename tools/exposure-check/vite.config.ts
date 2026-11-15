import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      check: { command: "node src/main.ts", cache: false },
    },
  },
});
