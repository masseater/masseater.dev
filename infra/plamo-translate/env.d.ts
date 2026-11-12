import type { PlamoModel } from "./plamo-model.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      MODEL: DurableObjectNamespace<PlamoModel>;
    }
  }
}
