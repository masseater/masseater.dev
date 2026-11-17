import { addonTasks } from "@r_masseater/lint-host/vite";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = [
  "native/core/Cargo.toml",
  "native/core/src/**",
  "native/node/Cargo.toml",
  "native/node/build.rs",
  "native/node/src/**",
  { pattern: "libs/napi-telemetry/Cargo.toml", base: "workspace" },
  { pattern: "libs/napi-telemetry/src/**", base: "workspace" },
  { pattern: "Cargo.lock", base: "workspace" },
  { pattern: "Cargo.toml", base: "workspace" },
  { pattern: "rust-toolchain.toml", base: "workspace" },
] as const;

const addon = addonTasks({
  command: "node bin/build-native.ts",
  inputs: CARGO_INPUTS,
  buildAfter: ["notices"],
});

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p h56m-core -p h56m-node --check && cargo clippy -p h56m-core -p h56m-node --all-targets --locked -- -D warnings && cargo test -p h56m-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      notices: {
        command: "node bin/notices.ts",
        cache: {
          input: [{ pattern: "Cargo.lock", base: "workspace" }],
          output: ["THIRD-PARTY-NOTICES.txt"],
        },
      },
      ...addon,
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/h56m.ts", vite: "src/app/vite.ts" },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
