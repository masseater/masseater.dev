import { tauriAppConfig, tauriAppTasks, tauriReleaseTasks } from "@masseater.dev/tauri-app/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1470, viewport: Option.some({ width: 1280, height: 820 }) }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "fushi",
        input: await cargoInputs({ directory: import.meta.dirname }),
      }),
      verify: { command: [], dependsOn: ["cargo", "screen"] },
      ...tauriReleaseTasks(),
    },
  },
});
