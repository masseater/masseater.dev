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
      "release:linux": {
        command:
          "node scripts/bundle.ts && node scripts/pluginval.ts && node scripts/host.ts && node scripts/clap-validator.ts && node scripts/archive.ts linux-x86_64",
        dependsOn: ["@masseater.dev/cargo-tools#build"],
        cache: false,
      },
      "release:windows": {
        command:
          "node scripts/bundle.ts && node scripts/pluginval.ts && node scripts/host.ts && node scripts/archive.ts windows-x86_64",
        cache: false,
      },
      "release:macos": {
        command:
          "node scripts/bundle.ts && node scripts/codesign.ts && node scripts/pluginval.ts && node scripts/host.ts && node scripts/clap-validator.ts && node scripts/archive.ts macos-universal",
        dependsOn: ["@masseater.dev/cargo-tools#build"],
        cache: false,
      },
      "release:tag": { command: "component-tag pod-rattle", cache: false },
      "release:publish": {
        command: "component-release pod-rattle pod-rattle release-assets",
        cache: false,
      },
      "release:token": { command: "release-please-token pod-rattle", cache: false },
    },
  },
});
