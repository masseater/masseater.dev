import type { Interviewer } from "./worker/kikite.worker.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      INTERVIEWER: DurableObjectNamespace<Interviewer>;
      CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
    }
  }
}
