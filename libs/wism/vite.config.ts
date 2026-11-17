import { addonTasks } from "@masseater.dev/lint-host/vite";
import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const CARGO_INPUTS = await cargoInputs({ directory: import.meta.dirname });

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo", "test", "build"] },
      cargo: {
        command:
          "cargo fmt -p wism-core -p wism-node --check && cargo clippy -p wism-core -p wism-node --all-targets --locked -- -D warnings && cargo test -p wism-core --locked",
        cache: { input: [...CARGO_INPUTS], output: [] },
      },
      ...addonTasks({ command: "node bin/build-native.ts", inputs: CARGO_INPUTS }),
    },
  },
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/wism.ts", vite: "src/app/vite.ts" },
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
