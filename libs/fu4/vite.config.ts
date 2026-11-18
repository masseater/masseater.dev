import { addonTasks } from "@masseater.dev/lint-host/vite";
import { DERIVATION_READS, cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = await cargoInputs({ directory: import.meta.dirname });

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p fu4-core -p fu4-node --check && cargo clippy -p fu4-core -p fu4-node --all-targets --locked -- -D warnings && cargo test -p fu4-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      ...addonTasks({
        command: "node bin/build-native.ts",
        inputs: CARGO_INPUTS,
        locked: [...LOCKED.input, ...DERIVATION_READS],
      }),
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/fu4.ts", vite: "src/app/vite.ts" },
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
