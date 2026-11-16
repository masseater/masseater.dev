import type { Player } from "./src/app/entrypoint/three-twelve.worker.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      PLAYER: DurableObjectNamespace<Player>;
      AUDIO: R2Bucket;
    }
  }
}
