import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p pod-rattle-host --check && cargo clippy -p pod-rattle-host --all-targets -- -D warnings && cargo test -p pod-rattle-host --test editor",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            "tests/**",
            { pattern: "apps/pod-rattle-plugin/src/**", base: "workspace" },
            { pattern: "apps/pod-rattle-plugin/Cargo.toml", base: "workspace" },
            { pattern: "libs/pod-rattle-engine/src/**", base: "workspace" },
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
          ],
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
