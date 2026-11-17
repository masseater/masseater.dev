import type { CacheEnv } from "./alchemy.run.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends CacheEnv {}
  }
}
