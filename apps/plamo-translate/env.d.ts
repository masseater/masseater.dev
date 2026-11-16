import type { PlamoModel } from "./src/app/translator.worker.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      MODEL: DurableObjectNamespace<PlamoModel>;
    }
  }
}
