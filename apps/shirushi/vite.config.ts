import { tauriAppConfig, tauriAppTasks } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1450, viewport: Option.none() }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "shirushi",
        workspaceInputs: ["libs/local-mcp/**", "libs/desktop-shell/**", "libs/media-notes/**"],
      }),
      verify: { command: [], dependsOn: ["cargo"] },
      "release:windows": {
        command:
          "tauri build --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis",
        cache: false,
      },
      "release:tag": { command: "component-tag shirushi", cache: false },
      "release:publish": {
        command: "component-release shirushi shirushi release-assets",
        cache: false,
      },
      "release:token": { command: "release-please-token shirushi", cache: false },
    },
  },
});
