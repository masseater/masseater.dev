import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const DEV_PORT = 1420;

export default defineConfig({
  test: { server: { deps: { inline: ["@effect/vitest"] } } },
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p aredoko-desktop --check && cargo clippy -p aredoko-desktop --all-targets --locked -- -D warnings && cargo test -p aredoko-desktop --locked",
        cache: {
          input: [
            "src-tauri/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
          ],
          output: [],
        },
      },
      "dev:app": {
        command:
          "set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222&& set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318&& set OTEL_TRACES_EXPORTER=otlp&& tauri dev",
        cache: false,
      },
    },
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
  clearScreen: false,
  envPrefix: ["VITE_", "OTEL_"],
  server: {
    port: DEV_PORT,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
