import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p desktop-shell --check && cargo clippy -p desktop-shell --all-targets --locked -- -D warnings && cargo test -p desktop-shell --locked",
        cache: {
          input: [...(await cargoInputs({ directory: import.meta.dirname }))],
          output: [],
        },
      },
    },
  },
});
