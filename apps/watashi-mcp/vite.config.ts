import {
  alchemyTasks,
  d1Tasks,
  deployTo,
  rejectsUnauthenticated,
} from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";
import type { PluginOption } from "vite-plus";

import { MCP_URL } from "./src/shared/config/index.ts";

const appPlugins = (mode: string): PluginOption[] => {
  if (mode === "test") {
    return [];
  }
  return [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      router: { routeTreeFileHeader: [] },
      rsc: { enabled: true },
    }),
    rsc(),
    viteReact(),
  ];
};

export default defineConfig(({ mode }) => ({
  msch: {
    lint: {
      overrides: [
        {
          files: ["src/**/*.{ts,tsx}"],
          excludeFiles: [
            "src/**/*-writer.server.ts",
            "src/entities/ledger/**",
            "src/features/{categorize,import-statements,report}/**",
          ],
          rules: { "msch-lint/db-writes-in-writers": "error" },
        },
      ],
    },
  },
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": {
        command: [deployTo("prod").command, rejectsUnauthenticated(MCP_URL)],
        cache: false,
      },
      verify: { command: [], dependsOn: ["auth:check"] },
      ...d1Tasks,
      "auth:generate":
        "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
      "auth:check":
        "auth generate --config auth.config.ts --output node_modules/.cache/auth.table.ts --yes && diff -u src/shared/auth/generated/auth.table.ts node_modules/.cache/auth.table.ts",
    },
  },
  test: {
    isolate: true,
    include: ["src/**/*.test.{ts,tsx}"],
    server: { deps: { external: ["miniflare", "workerd"] } },
    testTimeout: 30_000,
  },
  plugins: [lapse(), ...appPlugins(mode)],
}));
