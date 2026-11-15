import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "worker-logs": { command: "node src/worker-logs.ts", cache: false },
    },
  },
});
