import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      codegen: {
        command: "node src/main.ts",
        cache: false,
      },
      "codegen:check": {
        command: "node src/main.ts --check",
        cache: false,
      },
    },
  },
});
