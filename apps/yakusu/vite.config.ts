import { tauriAppConfig } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({
  crate: "yakusu",
  devPort: 1430,
  viewport: Option.some({ width: 1180, height: 760 }),
  workspaceInputs: [],
});

export default defineConfig(
  mergeConfig(app, {
    run: {
      tasks: {
        verify: { command: [], dependsOn: ["cargo"] },
        "release:tag": { command: "component-tag yakusu", cache: false },
        "release:publish": { command: "component-release yakusu yakusu installers", cache: false },
        "release:token": { command: "release-please-token yakusu", cache: false },
      },
    },
  }),
);
