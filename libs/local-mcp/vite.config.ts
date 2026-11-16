import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p local-mcp --check && cargo clippy -p local-mcp --all-targets --locked -- -D warnings && cargo test -p local-mcp --locked",
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
