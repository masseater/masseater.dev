import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "portal-status": { command: "node bin/status.ts", cache: false },
      "deploy:production": {
        command: [
          "alchemy deploy --config alchemy.portal.ts --stage prod --yes",
          "node bin/status.ts",
        ],
        cache: false,
        dependsOn: [
          "watashi-mcp#deploy:production",
          "sundries#deploy:production",
          "twilog-mcp#deploy:production",
          "money#deploy:production",
        ],
      },
    },
  },
});
