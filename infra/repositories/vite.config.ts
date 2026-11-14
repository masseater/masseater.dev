import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      overrides: [{ files: ["*.worker.ts"], excludeFiles: ["**/*.test.ts"], use: ["traced"] }],
    },
  },
  run: {
    tasks: {
      tokens: { command: "vpx cloudflare-tokens.ts", cache: false },
    },
  },
});
