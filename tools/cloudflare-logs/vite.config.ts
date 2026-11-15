import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "worker-logs": { command: "node src/worker-logs.ts", cache: false },
      "builds-logs": { command: "node src/builds-logs.ts", cache: false },
    },
  },
});
