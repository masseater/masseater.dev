import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      status: { command: "node status.ts", cache: false },
      "deploy:production": {
        command: ["alchemy deploy --config alchemy.portal.ts --stage prod --yes", "node status.ts"],
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
