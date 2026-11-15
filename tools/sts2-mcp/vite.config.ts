import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      start: { command: "node bin/sts2-mcp.ts", cache: false },
    },
  },
});
