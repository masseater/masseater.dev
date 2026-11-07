import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";

import type { WebEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WebEnv, "SLIDE_INDEX" | "SCRAP_ROUTINE_TOKEN" | "SLOPPEDIA_GITHUB"> &
  Readonly<{
    SLIDE_INDEX: VectorizeIndex;
    SCRAP_ROUTINE_TOKEN: SecretsStoreSecret;
    SLOPPEDIA_GITHUB: Service<SloppediaGitHub>;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
