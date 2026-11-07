import type { Player } from "./worker/three-twelve.worker.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      PLAYER: DurableObjectNamespace<Player>;
      AUDIO: R2Bucket;
    }
  }
}
