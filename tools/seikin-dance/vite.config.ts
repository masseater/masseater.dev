import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p seikin-dance --check && cargo clippy -p seikin-dance --all-targets -- -D warnings && cargo test -p seikin-dance",
        cache: {
          input: [
            "Cargo.toml",
            "package.json",
            "src/**",
            "tests/**",
            {
              pattern: "apps/portfolio/src/features/dance-stage/model/generated/track.json",
              base: "workspace",
            },
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: [],
        },
      },
      generate: {
        command: "cargo run --release -p seikin-dance --",
        cache: false,
      },
    },
  },
});
