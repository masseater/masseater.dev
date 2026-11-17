import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      render: {
        command: "node bin/extract.ts && node bin/render.ts",
        cache: {
          input: [
            "bin/extract.ts",
            "bin/render.ts",
            "scenarios.json",
            { pattern: "apps/labs/pages/pod-rattle/index.html", base: "workspace" },
          ],
          output: ["generated/**", "reference/**"],
        },
      },
      cargo: {
        command:
          'cargo fmt -p pod-rattle-engine --check && cargo clippy -p pod-rattle-engine --all-targets -- -D warnings && cargo test -p pod-rattle-engine && GUNGRAUN_RUNNER="$PWD/../../tools/cargo-tools/target/release/gungraun-runner" cargo bench -p pod-rattle-engine --bench instructions',
        dependsOn: ["render", "@masseater.dev/cargo-tools#build"],
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            "tests/**",
            "benches/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
            "reference/**",
          ],
          output: [],
        },
      },
    },
  },
});
