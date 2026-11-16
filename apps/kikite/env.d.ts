import type { Interviewer } from "./src/app/kikite.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      INTERVIEWER: DurableObjectNamespace<Interviewer>;
      CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
      SESSIONS: D1Database;
    }
  }
}
