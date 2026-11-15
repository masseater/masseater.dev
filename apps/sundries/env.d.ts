import type { TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";
import type {
  AccessOAuth,
  ClaudeRoutine,
  SloppediaGitHub,
  Tailnet,
} from "@masseater.dev/repositories/credential-broker.worker";

import type { WorkerEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<
  WorkerEnv,
  "SLIDE_INDEX" | "SLOPPEDIA_GITHUB" | "ACCESS_OAUTH" | "CLAUDE_ROUTINE" | "TRANSLATOR" | "TAILNET"
> &
  Readonly<{
    SLIDE_INDEX: VectorizeIndex;
    SLOPPEDIA_GITHUB: Service<SloppediaGitHub>;
    ACCESS_OAUTH: Service<AccessOAuth>;
    CLAUDE_ROUTINE: Service<ClaudeRoutine>;
    TRANSLATOR: Service<TranslatorRpc>;
    TAILNET: Service<Tailnet>;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
