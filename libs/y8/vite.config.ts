import { addonTasks } from "@r_masseater/lint-host/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = await cargoInputs({ directory: import.meta.dirname });

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
      ...addonTasks({ command: "node bin/build-native.ts", inputs: CARGO_INPUTS }),
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
