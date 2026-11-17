import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command: "cargo fmt -p xtask --check && cargo clippy -p xtask --all-targets -- -D warnings",
        cache: {
          input: [...(await cargoInputs({ directory: import.meta.dirname }))],
          output: [],
        },
      },
    },
  },
});
