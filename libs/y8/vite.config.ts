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
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p y8-core -p y8-node --check && cargo clippy -p y8-core -p y8-node --all-targets --locked -- -D warnings && cargo test -p y8-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      native: {
        command: "node bin/build-native.ts",
        cache: { input: [...CARGO_INPUTS, "package.json"], output: ["native/*.node"] },
      },
      build: { command: "vp pack", dependsOn: ["native"] },
      test: { command: "vp test run", dependsOn: ["native"] },
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/y8.ts", vite: "src/app/vite.ts" },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
