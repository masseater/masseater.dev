import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          'cargo fmt -p pod-rattle-engine --check && cargo clippy -p pod-rattle-engine --all-targets -- -D warnings && cargo test -p pod-rattle-engine && GUNGRAUN_RUNNER="$PWD/../../tools/cargo-tools/target/release/gungraun-runner" cargo bench -p pod-rattle-engine --bench instructions',
        dependsOn: ["@masseater.dev/pod-rattle-parity#render", "@masseater.dev/cargo-tools#build"],
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            "tests/**",
            "benches/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
            { pattern: "tools/pod-rattle-parity/reference/**", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
});
