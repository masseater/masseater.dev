import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p desktop-shell --check && cargo clippy -p desktop-shell --all-targets --locked -- -D warnings && cargo test -p desktop-shell --locked",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
});
