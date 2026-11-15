import { alchemyTasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import type { PluginOption } from "vite-plus";

const appPlugins = (mode: string): PluginOption[] => {
  if (mode === "test") {
    return [];
  }
  return [
    tailwindcss(),
    tanstackStart({ srcDirectory: "src/app", router: { routeTreeFileHeader: [] } }),
    viteReact(),
  ];
};

export default defineConfig(({ mode }) => ({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": {
        command: [
          deployTo("prod").command,
          "alchemy deploy alchemy.retired.ts --stage prod --yes",
          "alchemy destroy alchemy.retired.ts --stage prod --yes",
        ],
        cache: false,
        dependsOn: ["watashi-mcp#deploy:production", "sundries#deploy:production"],
      },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: appPlugins(mode),
}));
