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
      dev: { command: "alchemy dev", cache: false },
      "db:generate": { command: "drizzle-kit generate", cache: false },
      "auth:generate": {
        command:
          "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
        cache: false,
      },
      "auth:check": {
        command: `out="$(mktemp -d)"; trap 'rm -rf "$out"' EXIT; if ! auth generate --config auth.config.ts --output "$out/auth.table.ts" --yes >"$out/log" 2>&1; then cat "$out/log" >&2; exit 1; fi; if ! diff -u src/shared/auth/generated/auth.table.ts "$out/auth.table.ts"; then echo "src/shared/auth/generated/auth.table.ts differs from what auth:generate writes. Run vp run auth:generate and commit the diff." >&2; exit 1; fi`,
        cache: false,
      },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
      ],
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  plugins: appPlugins(mode),
}));
