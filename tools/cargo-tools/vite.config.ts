import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["build"] },
      build: {
        command:
          "cargo build --release --locked -p clap-validator --bin clap-validator -p gungraun-runner --bin gungraun-runner",
        cache: {
          input: [
            "Cargo.toml",
            "Cargo.lock",
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: ["target/release/clap-validator*", "target/release/gungraun-runner*"],
        },
      },
    },
  },
});
