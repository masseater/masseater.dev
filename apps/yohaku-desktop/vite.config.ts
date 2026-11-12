import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const DEV_PORT = 1440;

const FONTCONFIG_FILE = `${import.meta.dirname}/fontconfig/fonts.conf`;

const ALLOWED_MISMATCHED_PIXELS = 0.002;

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: { channel: "chrome", env: { FONTCONFIG_FILE } },
      }),
      instances: [{ browser: "chromium" }],
      viewport: { width: 1280, height: 800 },
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { allowedMismatchedPixelRatio: ALLOWED_MISMATCHED_PIXELS },
        },
      },
    },
  },
  run: {
    tasks: {
      cargo: {
        command:
          "cargo fmt -p yohaku-desktop --check && cargo clippy -p yohaku-desktop --all-targets --locked -- -D warnings && cargo test -p yohaku-desktop --locked",
        cache: {
          input: [
            "src-tauri/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
            { pattern: "libs/yohaku-protocol/src/server-flags.ts", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
  resolve: { tsconfigPaths: true },
  optimizeDeps: { include: ["effect/crypto"] },
  plugins: [tailwindcss(), viteReact()],
  clearScreen: false,
  server: {
    port: DEV_PORT,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
