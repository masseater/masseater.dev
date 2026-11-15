import type { AccessOAuth } from "@masseater.dev/repositories/credential-broker.worker";

import type { WorkerEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WorkerEnv, "ACCESS_OAUTH"> & Readonly<{ ACCESS_OAUTH: Service<AccessOAuth> }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
