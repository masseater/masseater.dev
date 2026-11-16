import { tauriAppConfig, tauriAppTasks, tauriReleaseTasks } from "@masseater.dev/tauri-app/vite";
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
      ...tauriReleaseTasks("shirushi"),
    },
  },
});
