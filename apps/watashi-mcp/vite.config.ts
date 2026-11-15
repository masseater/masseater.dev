import { alchemyTasks, d1Tasks, deployTo } from "@masseater.dev/cloudflare-account/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";
import type { PluginOption } from "vite-plus";

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
          excludeFiles: ["src/**/*-writer.server.ts"],
          rules: {
            "eslint/no-restricted-properties": [
              "error",
              {
                object: "db",
                property: "insert",
                message:
                  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため",
              },
              {
                object: "db",
                property: "update",
                message:
                  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため",
              },
              {
                object: "db",
                property: "delete",
                message:
                  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため",
              },
              {
                object: "db",
                property: "batch",
                message:
                  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため",
              },
              {
                object: "db",
                property: "run",
                message:
                  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため",
              },
            ],
          },
        },
      ],
    },
  },
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": {
        ...deployTo("prod"),
        dependsOn: ["plamo-translate#deploy:production"],
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
    include: ["src/**/*.test.{ts,tsx}"],
    server: { deps: { external: ["miniflare", "workerd"] } },
  },
  plugins: appPlugins(mode),
}));
