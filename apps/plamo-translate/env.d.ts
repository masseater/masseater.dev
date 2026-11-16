import type { PlamoModel } from "./src/app/translator.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      MODEL: DurableObjectNamespace<PlamoModel>;
    }
  }
}
