import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p effect2rs-conformance --check && cargo clippy -p effect2rs-conformance --all-targets -- -D warnings && cargo test -p effect2rs-conformance",
        cache: {
          input: [
            "Cargo.toml",
            "conformance/**",
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
