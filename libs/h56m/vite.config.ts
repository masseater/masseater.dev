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
      ...addonTasks({
        command: "node bin/build-native.ts",
        inputs: CARGO_INPUTS,
        locked: [...LOCKED.input, ...DERIVATION_READS],
        buildAfter: ["notices"],
      }),
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/h56m.ts", vite: "src/app/vite.ts" },
    platform: "node",
    deps: { alwaysBundle: ["@masseater.dev/lint-host"] },
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
