import { tauriAppConfig } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({
  crate: "aredoko-desktop",
  devPort: 1420,
  viewport: Option.none(),
  workspaceInputs: [],
});

export default defineConfig(
  mergeConfig(app, {
    test: { server: { deps: { inline: ["@effect/vitest"] } } },
    run: {
      tasks: {
        "dev:app": {
          command:
            "set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222&& set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318&& set OTEL_TRACES_EXPORTER=otlp&& tauri dev",
          cache: false,
        },
      },
    },
    envPrefix: ["VITE_", "OTEL_"],
  }),
);
