import { alchemyTasks, d1Tasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { Option } from "effect";
import { defineConfig } from "vite-plus";
import type { PluginOption } from "vite-plus";

import { SEARCH_INDEX_ORIGIN, SITEMAP_FILE } from "./src/shared/config/index.ts";

const appPlugins = (mode: string): PluginOption[] => {
  if (mode === "test") {
    return [];
  }
  return [
    devtools(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      rsc: { enabled: true },
      pages: [{ path: "/" }],
      sitemap: Option.match(SEARCH_INDEX_ORIGIN, {
        onNone: () => ({ enabled: false }),
        onSome: (host) => ({ host, outputPath: SITEMAP_FILE }),
      }),
    }),
    rsc(),
    viteReact(),
  ];
};

export default defineConfig(({ mode }) => ({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": deployTo("production"),
      verify: { command: [], dependsOn: ["auth:check"] },
      ...d1Tasks,
      "auth:generate":
        "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
      "auth:check":
        "auth generate --config auth.config.ts --output node_modules/.cache/auth.table.ts --yes && diff -u src/shared/auth/generated/auth.table.ts node_modules/.cache/auth.table.ts",
    },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: appPlugins(mode),
}));
