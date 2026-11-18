import { tauriAppConfig, tauriAppTasks } from "@masseater.dev/tauri-app/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({ devPort: 1420, viewport: Option.none() });

export default defineConfig({
  ...mergeConfig(app, {
    test: { server: { deps: { inline: ["@effect/vitest"] } } },
  }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "aredoko-desktop",
        input: await cargoInputs({ directory: import.meta.dirname }),
      }),
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
          "set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222&& tauri dev",
        cache: false,
      },
    },
  },
});
