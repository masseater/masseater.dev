import { addonTasks } from "@r_masseater/lint-host/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = await cargoInputs({ directory: import.meta.dirname });

export default defineConfig({
  msch: {
    lint: {
      ignorePatterns: ["native/core/tests/fixtures/**", "native/core/data/**"],
      overrides: [
        {
          files: ["src/features/generate-data/model/if-version.ts"],
          rules: { "typescript/prefer-readonly-parameter-types": "off" },
        },
      ],
    },
  },
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p fu4-core -p fu4-node --check && cargo clippy -p fu4-core -p fu4-node --all-targets --locked -- -D warnings && cargo test -p fu4-core --release --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      "generate-data": { command: "node bin/generate-data.ts", cache: false },
      ...addonTasks({ command: "node bin/build-native.ts", inputs: CARGO_INPUTS }),
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/fu4.ts", vite: "src/app/vite.ts" },
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
