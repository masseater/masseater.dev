import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = [
  "native/core/Cargo.toml",
  "native/core/src/**",
  "native/core/tests/**",
  "native/node/Cargo.toml",
  "native/node/build.rs",
  "native/node/src/**",
  { pattern: "Cargo.lock", base: "workspace" },
  { pattern: "Cargo.toml", base: "workspace" },
  { pattern: "rust-toolchain.toml", base: "workspace" },
] as const;

export default defineConfig({
  msch: { lint: { ignorePatterns: ["native/core/tests/fixtures/**"] } },
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test"] },
      cargo: {
        command:
          "cargo fmt -p mdlint-core -p mdlint-node --check && cargo clippy -p mdlint-core -p mdlint-node --all-targets --locked -- -D warnings && cargo test -p mdlint-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      native: {
        command: "node bin/build-native.ts",
        cache: { input: [...CARGO_INPUTS, "bin/build-native.ts"], output: ["native/*.node"] },
      },
      test: { command: "vp test run", dependsOn: ["native"] },
    },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
