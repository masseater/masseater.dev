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
        "release:linux": {
          command: "node scripts/fetch-runtime.ts linux-x64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles deb,appimage && bundle-collect deb appimage",
          cache: false,
        },
        "release:windows": {
          command: "node scripts/fetch-runtime.ts windows-x64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis",
          cache: false,
        },
        "release:macos": {
          command: "node scripts/fetch-runtime.ts macos-arm64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles dmg && bundle-collect dmg",
          cache: false,
        },
        "release:check:linux": {
          command: "node scripts/launch-installed.ts linux-x64 release-assets",
          cache: false,
        },
        "release:check:windows": {
          command: "node scripts/launch-installed.ts windows-x64 release-assets",
          cache: false,
        },
        "release:check:macos": {
          command: "node scripts/launch-installed.ts macos-arm64 release-assets",
          cache: false,
        },
        "release:tag": { command: "component-tag yakusu", cache: false },
        "release:publish": { command: "component-release yakusu yakusu release-assets", cache: false },
        "release:token": { command: "release-please-token yakusu", cache: false },
      },
    },
  }),
);
