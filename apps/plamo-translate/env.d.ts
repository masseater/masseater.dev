import type { PlamoModel } from "./translator.worker.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      MODEL: DurableObjectNamespace<PlamoModel>;
    }
  }
}
