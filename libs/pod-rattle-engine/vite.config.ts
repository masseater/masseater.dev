import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p pod-rattle-engine --check && cargo clippy -p pod-rattle-engine --all-targets -- -D warnings && cargo test -p pod-rattle-engine && cargo test --release -p pod-rattle-engine --test perf -- --nocapture",
        dependsOn: ["@masseater.dev/pod-rattle-parity#render"],
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            "tests/**",
            "benches/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
            { pattern: "tools/pod-rattle-parity/reference/**", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
});
