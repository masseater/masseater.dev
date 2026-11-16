import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["build"] },
      build: {
        command: "node bin/build.ts",
        cache: {
          input: [
            "Cargo.toml",
            "Cargo.lock",
            "bin/**",
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: ["target/release/*"],
        },
      },
    },
  },
});
