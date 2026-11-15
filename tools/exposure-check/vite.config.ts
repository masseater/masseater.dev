import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      check: { command: "node bin/exposure-check.ts", cache: false },
    },
  },
});
