import type {
  CredentialStatusRpc,
  MoneyPortalRpc,
  SlidesRpc,
  WatashiPortalRpc,
} from "@masseater.dev/portal-protocol";

import type { WebEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WebEnv, "PERSONAL" | "WATASHI" | "MONEY" | "SLIDES" | "CREDENTIALS"> &
  Readonly<{
    PERSONAL: Fetcher;
    WATASHI: Service<WatashiPortalRpc>;
    MONEY: Service<MoneyPortalRpc>;
    SLIDES: Service<SlidesRpc>;
    CREDENTIALS: Service<CredentialStatusRpc>;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
