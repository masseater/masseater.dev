import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p pod-rattle-host --check && cargo clippy -p pod-rattle-host --all-targets -- -D warnings && cargo test -p pod-rattle-host",
        cache: {
          input: [...(await cargoInputs({ directory: import.meta.dirname }))],
          output: [],
        },
      },
      host: {
        command:
          'cargo run --package xtask --release -- bundle pod_rattle --release && cargo run -p pod-rattle-host -- "../../target/bundled/Pod Rattle.vst3" ../../target/pod-rattle-host',
        cache: false,
      },
    },
  },
});
