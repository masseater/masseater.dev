import type { WorkerEnv } from "./alchemy.run.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WorkerEnv {}
  }
}
