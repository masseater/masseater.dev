import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p seikin-dance --check && cargo clippy -p seikin-dance --all-targets -- -D warnings && cargo test -p seikin-dance",
        cache: {
          input: [
            ...(await cargoInputs({ directory: import.meta.dirname })),
            {
              pattern: "apps/portfolio/src/features/dance-stage/model/generated/track.json",
              base: "workspace",
            },
          ],
          output: [],
        },
      },
      generate: {
        command: "cargo run --release -p seikin-dance --",
        cache: false,
      },
    },
  },
});
