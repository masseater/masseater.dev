import { defineConfig } from "vite-plus";

import { fumx } from "./src/app/vite.ts";

export default defineConfig({
  plugins: [fumx()],
  run: {
    tasks: {
      grammar: "langium generate",
      "grammar:check": "langium generate && git diff --exit-code -- generated",
      typecheck: "tsc --runExternalCode",
      verify: { command: [], dependsOn: ["grammar:check", "typecheck"] },
    },
  },
});
