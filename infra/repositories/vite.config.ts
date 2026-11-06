import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      tokens: { command: "vpx cloudflare-tokens.ts", cache: false },
    },
  },
});
