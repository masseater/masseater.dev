import { CLEF_MODEL } from "#/entities/decision/index.ts";

import { syncProvider } from "./sync-provider.ts";

export const cloudflare = syncProvider({
  name: "cloudflare",
  worker: "cloudflare-worker",
  requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  models: CLEF_MODEL,
});
