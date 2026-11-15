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
      "deploy:broker": {
        command: "alchemy deploy --config alchemy.broker.ts --stage prod --yes",
        cache: false,
      },
      "deploy:github": {
        command: "alchemy deploy --config alchemy.github.ts --stage prod --yes",
        cache: false,
      },
    },
  },
});
