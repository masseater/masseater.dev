import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p pod_rattle --check && cargo clippy -p pod_rattle --all-targets -- -D warnings && cargo test -p pod_rattle",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            "tests/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
            { pattern: "libs/pod-rattle-engine/Cargo.toml", base: "workspace" },
            { pattern: "libs/pod-rattle-engine/src/**", base: "workspace" },
          ],
          output: [],
        },
      },
      bundle: {
        command: "cargo run --package xtask --release -- bundle pod_rattle --release",
        cache: false,
      },
      "ci:bundle": { command: "node scripts/bundle.ts", cache: false },
      "ci:codesign": { command: "node scripts/codesign.ts", cache: false },
      "ci:pluginval": { command: "node scripts/pluginval.ts", cache: false },
      "ci:host": { command: "node scripts/host.ts", cache: false },
      "ci:clap-validator": { command: "node scripts/clap-validator.ts", cache: false },
      "ci:archive": { command: "node scripts/archive.ts", cache: false },
      "release:tag": { command: "component-tag pod-rattle", cache: false },
      "release:publish": {
        command: "component-release pod-rattle pod-rattle plugins",
        cache: false,
      },
      "release:token": { command: "release-please-token pod-rattle", cache: false },
    },
  },
});
