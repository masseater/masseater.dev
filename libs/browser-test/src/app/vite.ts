import type { UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const FONTCONFIG_FILE = `${import.meta.dirname}/fonts.conf`;
const ALLOWED_MISMATCHED_PIXELS = 0.002;

export const browserTest = (viewport: Readonly<{ width: number; height: number }>): UserConfig => ({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: "chrome", env: { FONTCONFIG_FILE } } }),
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
