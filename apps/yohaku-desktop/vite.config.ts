import { tauriAppConfig, tauriAppTasks } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({ devPort: 1440, viewport: Option.some({ width: 1280, height: 800 }) });

export default defineConfig({
  ...mergeConfig(app, {
    optimizeDeps: { include: ["effect/crypto"] },
  }),
  run: {
    tasks: {
      ...tauriAppTasks({ crate: "yohaku-desktop", workspaceInputs: [] }),
      verify: { command: [], dependsOn: ["cargo"] },
      "release:tag": { command: "component-tag yohaku", cache: false },
      "release:windows": {
        command:
          "tauri build --bundles nsis --config src-tauri/tauri.release.conf.json && node scripts/collect.ts",
        cache: false,
      },
      "release:macos": {
        command:
          "tauri build --bundles app,dmg --config src-tauri/tauri.release.conf.json && node scripts/collect.ts",
        cache: false,
      },
      "release:publish": { command: "node scripts/release.ts", cache: false },
      "release:token": { command: "release-please-token yohaku", cache: false },
      "signing-key": { command: "node scripts/signing-key.ts", cache: false },
    },
  },
});
