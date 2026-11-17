import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "claim-npm-names": { command: "node bin/claim-names.ts", cache: false },
    },
  },
});
