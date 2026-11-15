import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["codegen:check"] },
      codegen: "node src/main.ts",
      "codegen:check": "node src/main.ts --check",
    },
  },
});
