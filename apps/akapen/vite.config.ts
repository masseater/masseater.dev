import { tauriAppConfig, tauriAppTasks, tauriReleaseTasks } from "@masseater.dev/tauri-app/vite";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1460, viewport: Option.none() }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "akapen",
        workspaceInputs: ["libs/local-mcp/**", "libs/desktop-shell/**", "libs/media-notes/**"],
      }),
      verify: { command: [], dependsOn: ["cargo"] },
      ...tauriReleaseTasks("akapen"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
  },
});
