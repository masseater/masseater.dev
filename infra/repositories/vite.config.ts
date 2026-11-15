import { defineConfig } from "vite-plus";

export default defineConfig({
  msch: {
    lint: {
      overrides: [{ files: ["*.worker.ts"], excludeFiles: ["**/*.test.ts"], use: ["traced"] }],
    },
  },
  run: {
    tasks: {
      "cloudflare-tokens": { command: "node cloudflare-tokens.ts", cache: false },
      "deploy:broker": {
        command: "alchemy deploy --config alchemy.broker.ts --stage prod --yes",
        cache: false,
      },
      "deploy:tailnet": {
        command: "alchemy deploy --config alchemy.tailnet.ts --stage prod --yes",
        cache: false,
      },
      "deploy:github": {
        command: "alchemy deploy --config alchemy.github.ts --stage prod --yes",
        cache: false,
      },
      "github-token": { command: "node scripts/github-token.ts", cache: false },
      "atproto-password": { command: "node scripts/atproto-password.ts", cache: false },
      "private-names": { command: "node scripts/private-names.ts", cache: false },
      "delete-repositories": { command: "node scripts/delete-repositories.ts", cache: false },
      "delete-secrets": { command: "node scripts/delete-secrets.ts", cache: false },
    },
  },
});
