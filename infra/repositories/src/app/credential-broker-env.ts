import type { GitHubAppEnv } from "#/entities/credential/index.ts";

import type { SideRouteInput } from "./side-routes.ts";

export type CredentialBrokerEnv = GitHubAppEnv &
  SideRouteInput["env"] &
  Readonly<{
    ROOT_TOKEN: SecretsStoreSecret;
    CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
    NPM_TOKEN?: SecretsStoreSecret;
    ACCOUNT_ID: string;
    GRANTS: string;
    GRANT_PROFILES: string;
    WORKFLOW_GRANTS: string;
  }>;
