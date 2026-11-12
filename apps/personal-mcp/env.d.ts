import type { Translator } from "@masseater.dev/plamo-translate/translator.worker";
import type {
  AccessOAuth,
  SloppediaGitHub,
} from "@masseater.dev/repositories/credential-broker.worker";

import type { WorkerEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<
  WorkerEnv,
  "SLIDE_INDEX" | "SLOPPEDIA_GITHUB" | "ACCESS_OAUTH" | "TRANSLATOR"
> &
  Readonly<{
    SLIDE_INDEX: VectorizeIndex;
    SLOPPEDIA_GITHUB: Service<SloppediaGitHub>;
    ACCESS_OAUTH: Service<AccessOAuth>;
    TRANSLATOR: Service<Translator>;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
