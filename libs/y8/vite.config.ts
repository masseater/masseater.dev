import { addonTasks } from "@masseater.dev/lint-host/vite";
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

const DOWNLOAD_ENV = ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", "SSL_CERT_FILE"];

export default defineConfig({
  msch: { lint: { ignorePatterns: ["native/core/tests/fixtures/**"] } },
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p y8-core -p y8-node --check && cargo clippy -p y8-core -p y8-node --all-targets --locked -- -D warnings && cargo test -p y8-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [], untrackedEnv: DOWNLOAD_ENV },
      },
      ...addonTasks({
        command: "node bin/build-native.ts",
        inputs: CARGO_INPUTS,
        untrackedEnv: DOWNLOAD_ENV,
      }),
    },
  },
  pack: {
    entry: {
      index: "src/app/index.ts",
      cli: "bin/y8.ts",
      vite: "src/app/vite.ts",
      kuromojin: "src/app/kuromojin.ts",
    },
    platform: "node",
    sourcemap: true,
    deps: { alwaysBundle: ["@masseater.dev/lint-host"] },
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  plugins: [otlp()],
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
