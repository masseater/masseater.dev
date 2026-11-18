import { tauriAppConfig, tauriAppTasks, tauriReleaseTasks } from "@masseater.dev/tauri-app/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { Option } from "effect";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ...tauriAppConfig({ devPort: 1460, viewport: Option.none() }),
  run: {
    tasks: {
      ...tauriAppTasks({
        crate: "yogoto",
        input: await cargoInputs({ directory: import.meta.dirname }),
      }),
      verify: { command: [], dependsOn: ["cargo"] },
      ...tauriReleaseTasks(),
      "release:windows": {
        command:
          "with-cuda --version 13.4.3 --compute-cap 80 --msvc 14.44 --runtime src-tauri/cuda -- tauri build --features cuda --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis",
        cache: false,
      },
    },
  },
});
