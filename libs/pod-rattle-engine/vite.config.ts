import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p pod-rattle-engine --check && cargo clippy -p pod-rattle-engine --all-targets -- -D warnings && cargo test -p pod-rattle-engine && cargo install --locked --quiet gungraun-runner --version \"$(cargo pkgid -p gungraun | sed 's/.*@//')\" && cargo bench -p pod-rattle-engine --bench instructions",
        dependsOn: ["@masseater.dev/pod-rattle-parity#render"],
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
