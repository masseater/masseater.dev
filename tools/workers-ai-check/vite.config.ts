import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      daily: { command: "node bin/workers-ai-check.ts", cache: false },
    },
  },
});
