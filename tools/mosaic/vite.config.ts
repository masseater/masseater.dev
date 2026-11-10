import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p mosaic --check && cargo clippy -p mosaic --all-targets -- -D warnings && cargo test -p mosaic",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            { pattern: "libs/mosaic/src/characters.json", base: "workspace" },
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
