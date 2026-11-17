import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p pod_rattle --check && cargo clippy -p pod_rattle --all-targets -- -D warnings && cargo test -p pod_rattle",
        cache: {
          input: [...(await cargoInputs({ directory: import.meta.dirname }))],
          output: [],
        },
      },
      bundle: {
        command: "cargo run --package xtask --release -- bundle pod_rattle --release",
        cache: false,
      },
      "release:linux": {
        command:
          "node bin/bundle.ts && node bin/pluginval.ts && node bin/host.ts && node bin/clap-validator.ts && node bin/archive.ts linux-x86_64",
        dependsOn: ["@masseater.dev/cargo-tools#build"],
        cache: false,
      },
      "release:windows": {
        command:
          "node bin/bundle.ts && node bin/pluginval.ts && node bin/host.ts && node bin/archive.ts windows-x86_64",
        cache: false,
      },
      "release:macos": {
        command:
          "node bin/bundle.ts && node bin/codesign.ts && node bin/pluginval.ts && node bin/host.ts && node bin/clap-validator.ts && node bin/archive.ts macos-universal",
        dependsOn: ["@masseater.dev/cargo-tools#build"],
        cache: false,
      },
    },
  },
});
