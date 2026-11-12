import { tauriAppConfig } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite-plus";

const app = tauriAppConfig({
  crate: "yohaku-desktop",
  devPort: 1440,
  viewport: Option.some({ width: 1280, height: 800 }),
  workspaceInputs: ["libs/yohaku-protocol/src/server-flags.ts"],
});

export default defineConfig(mergeConfig(app, { optimizeDeps: { include: ["effect/crypto"] } }));
