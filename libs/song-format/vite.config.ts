import { defineConfig } from "vite-plus";

import { fumx } from "./src/app/vite.ts";

export default defineConfig({
  plugins: [fumx()],
  run: {
    tasks: {
      typecheck: "tsc --runExternalCode",
      verify: { command: [], dependsOn: ["typecheck"] },
    },
  },
});
