import type { Player } from "./src/app/three-twelve.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      PLAYER: DurableObjectNamespace<Player>;
      AUDIO: R2Bucket;
    }
  }
}
