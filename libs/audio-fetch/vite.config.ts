import { cargoInputs } from "@r_masseater/msch/cargo-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      cargo: {
        command:
          "cargo fmt -p audio-fetch --check && cargo clippy -p audio-fetch --all-targets --locked -- -D warnings && cargo test -p audio-fetch --locked",
        cache: {
          input: [...(await cargoInputs({ directory: import.meta.dirname }))],
          output: [],
          untrackedEnv: ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", "SSL_CERT_FILE"],
        },
      },
    },
  },
});
