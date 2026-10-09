import type { WebEnv } from "./alchemy.run.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WebEnv {}
  }
}

declare module "react" {
  interface CSSProperties extends Partial<Record<`--${string}`, number | string>> {}
}
