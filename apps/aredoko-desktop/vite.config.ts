import { tauriAppConfig, tauriAppTasks } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({ devPort: 1420, viewport: Option.none() });

export default defineConfig({
  ...mergeConfig(app, {
    test: { server: { deps: { inline: ["@effect/vitest"] } } },
  }),
  run: {
    tasks: {
      ...tauriAppTasks({ crate: "aredoko-desktop", workspaceInputs: [] }),
      verify: { command: [], dependsOn: ["cargo"] },
      installer: {
        command: "tauri build --config src-tauri/tauri.release.conf.json",
        dependsOn: ["aredoko-server#installer:resources"],
        cache: false,
      },
      "release:windows": {
        command: "bundle-collect nsis",
        dependsOn: ["installer"],
        cache: false,
      },
      "dev:app": {
        command:
          "set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222&& set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318&& set OTEL_TRACES_EXPORTER=otlp&& tauri dev",
        cache: false,
      },
    },
  },
  envPrefix: ["VITE_", "OTEL_"],
});
