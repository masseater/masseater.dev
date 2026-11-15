import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["codegen:check"] },
      codegen: "node bin/protocol-codegen.ts",
      "codegen:check": "node bin/protocol-codegen.ts --check",
    },
  },
});
