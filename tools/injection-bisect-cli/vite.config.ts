import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      start: { command: "node bin/injection-bisect.ts", cache: false },
    },
  },
});
