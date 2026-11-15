import { alchemyTasks } from "@masseater.dev/cloudflare-account/alchemy-tasks";
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
          excludeFiles: ["src/features/mcp/api/*-writer.server.ts"],
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
      verify: { command: [], dependsOn: ["auth:check"] },
      "db:generate": { command: "drizzle-kit generate", cache: false },
      "auth:generate": {
        command:
          "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
      },
      "auth:check": {
        command: `out="$(mktemp -d)"; trap 'rm -rf "$out"' EXIT; if ! auth generate --config auth.config.ts --output "$out/auth.table.ts" --yes >"$out/log" 2>&1; then cat "$out/log" >&2; exit 1; fi; if ! diff -u src/shared/auth/generated/auth.table.ts "$out/auth.table.ts"; then echo "src/shared/auth/generated/auth.table.ts differs from what auth:generate writes. Run vp run auth:generate and commit the diff." >&2; exit 1; fi`,
      },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
      ],
    },
  },
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    server: { deps: { external: ["miniflare", "workerd"] } },
  },
  plugins: appPlugins(mode),
}));
