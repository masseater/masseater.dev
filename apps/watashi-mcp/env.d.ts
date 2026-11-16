import type { TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";

import type { WebEnv } from "./alchemy.run.ts";
import type { TraitBuilder } from "./src/features/build-traits/api/trait-builder.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WebEnv {
      TRAIT_BUILDER: DurableObjectNamespace<TraitBuilder>;
      TRANSLATOR: Service<TranslatorRpc>;
    }
  }
}
