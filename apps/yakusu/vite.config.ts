import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const DEV_PORT = 1430;

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
      viewport: { width: 1180, height: 760 },
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
          "cargo fmt -p yakusu --check && cargo clippy -p yakusu --all-targets --locked && cargo test -p yakusu --locked",
        cache: {
          input: [
            "src-tauri/**",
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: ".cargo/**", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
  clearScreen: false,
  server: {
    port: DEV_PORT,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
