import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p pod_rattle --check && cargo clippy -p pod_rattle --all-targets -- -D warnings && cargo test -p pod_rattle",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
            { pattern: "libs/pod-rattle-engine/Cargo.toml", base: "workspace" },
            { pattern: "libs/pod-rattle-engine/src/**", base: "workspace" },
            { pattern: "vendor/**", base: "workspace" },
          ],
          output: [],
        },
      },
      bundle: { command: "cargo xtask bundle pod_rattle --release", cache: false },
    },
  },
});
