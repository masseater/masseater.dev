import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";

import type { WorkerEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WorkerEnv, "SLIDE_INDEX" | "SLOPPEDIA_GITHUB"> &
  Readonly<{
    SLIDE_INDEX: VectorizeIndex;
    SLOPPEDIA_GITHUB: Service<SloppediaGitHub>;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
