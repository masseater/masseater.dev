import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      exposure: { command: "node src/main.ts", cache: false },
    },
  },
});
