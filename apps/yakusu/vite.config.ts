import { tauriAppConfig } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig(
  tauriAppConfig({
    crate: "yakusu",
    devPort: 1430,
    viewport: Option.some({ width: 1180, height: 760 }),
    workspaceInputs: [],
  }),
);
