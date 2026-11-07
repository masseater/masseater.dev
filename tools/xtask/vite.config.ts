import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      cargo: {
        command: "cargo fmt -p xtask --check && cargo clippy -p xtask --all-targets -- -D warnings",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
});
