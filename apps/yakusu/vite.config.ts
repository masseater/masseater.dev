import { tauriAppConfig, tauriAppTasks } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1430, viewport: Option.some({ width: 1180, height: 760 }) }),
  run: {
    tasks: {
      ...tauriAppTasks({ crate: "yakusu", workspaceInputs: [] }),
      verify: { command: [], dependsOn: ["cargo"] },
      "release:linux": {
        command:
          "node bin/fetch-runtime.ts linux-x64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles deb,appimage && bundle-collect deb appimage",
        cache: false,
      },
      "release:windows": {
        command:
          "node bin/fetch-runtime.ts windows-x64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis",
        cache: false,
      },
      "release:macos": {
        command:
          "node bin/fetch-runtime.ts macos-arm64 && cargo test --package yakusu --test engine --locked -- --ignored && tauri build --config src-tauri/tauri.release.conf.json --bundles dmg && bundle-collect dmg",
        cache: false,
      },
      "release:check:linux": {
        command: "node bin/launch-installed.ts linux-x64 release-assets",
        cache: false,
      },
      "release:check:windows": {
        command: "node bin/launch-installed.ts windows-x64 release-assets",
        cache: false,
      },
      "release:check:macos": {
        command: "node bin/launch-installed.ts macos-arm64 release-assets",
        cache: false,
      },
      "release:tag": { command: "component-tag yakusu", cache: false },
      "release:publish": {
        command: "component-release yakusu yakusu release-assets",
        cache: false,
      },
      "release:token": { command: "release-please-token yakusu", cache: false },
    },
  },
});
