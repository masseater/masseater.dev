import { fileURLToPath } from "node:url";

import type { UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const FONTCONFIG_FILE = `${import.meta.dirname}/../fontconfig/fonts.conf`;
const FONT_HOME = fileURLToPath(
  new URL("..", import.meta.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf")),
);
const ALLOWED_MISMATCHED_PIXELS = 0.002;

export const browserTest = (viewport: Readonly<{ width: number; height: number }>): UserConfig => ({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: { channel: "chrome", env: { FONTCONFIG_FILE, XDG_DATA_HOME: FONT_HOME } },
      }),
      instances: [{ browser: "chromium" }],
      viewport: { ...viewport },
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { allowedMismatchedPixelRatio: ALLOWED_MISMATCHED_PIXELS },
        },
      },
    },
  },
});
