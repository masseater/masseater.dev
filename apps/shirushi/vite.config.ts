import { tauriAppConfig, tauriAppTasks, tauriReleaseTasks } from "@masseater.dev/tauri-app/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1450, viewport: Option.none() }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "shirushi",
        input: await cargoInputs({ directory: import.meta.dirname }),
      }),
      verify: { command: [], dependsOn: ["cargo", "screen"] },
      ...tauriReleaseTasks(),
    },
  },
});
