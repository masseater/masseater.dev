import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      exposure: { command: "node bin/exposure-check.ts", cache: false },
    },
  },
});
