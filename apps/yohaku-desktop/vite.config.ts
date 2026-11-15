import { tauriAppConfig } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({
  crate: "yohaku-desktop",
  devPort: 1440,
  viewport: Option.some({ width: 1280, height: 800 }),
  workspaceInputs: [],
});

export default defineConfig(
  mergeConfig(app, {
    optimizeDeps: { include: ["effect/crypto"] },
    run: {
      tasks: {
        verify: { command: [], dependsOn: ["cargo"] },
        "release:tag": { command: "component-tag yohaku", cache: false },
        "release:collect": { command: "node scripts/collect.ts", cache: false },
        "release:publish": { command: "node scripts/release.ts", cache: false },
        "release:token": { command: "release-please-token yohaku", cache: false },
        "signing-key": { command: "node scripts/signing-key.ts", cache: false },
      },
    },
  }),
);
