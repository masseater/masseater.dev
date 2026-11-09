import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      collect: { command: "node src/main.ts", cache: false },
    },
  },
});
