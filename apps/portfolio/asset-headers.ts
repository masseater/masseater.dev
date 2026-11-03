import { Array as Arr, Record as Rec, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { SECURITY_HEADERS } from "./src/shared/config/security-headers.ts";

const CLIENT_ENVIRONMENT = "client";

const HEADERS_FILE = pipe(
  [
    "/*",
    ...pipe(
      Rec.toEntries(SECURITY_HEADERS),
      Arr.map(([name, value]) => `  ${name}: ${value}`),
    ),
    "",
  ],
  Arr.join("\n"),
);

const assetHeaders = (): Plugin => ({
  name: "asset-headers",
  apply: "build",
  generateBundle() {
    if (this.environment.name === CLIENT_ENVIRONMENT) {
      this.emitFile({ type: "asset", fileName: "_headers", source: HEADERS_FILE });
    }
  },
});

export { assetHeaders };
