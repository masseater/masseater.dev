import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "worker-logs": { command: "node bin/worker-logs.ts", cache: false },
      "builds-logs": { command: "node bin/builds-logs.ts", cache: false },
    },
  },
});
