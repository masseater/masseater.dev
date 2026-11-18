import type { Audit } from "#/features/zizmor/model/audit.ts";
import { artipacked } from "#/features/zizmor/rules/artipacked.ts";
import { githubApp } from "#/features/zizmor/rules/github-app.ts";
import { hardcodedContainerCredentials } from "#/features/zizmor/rules/hardcoded-container-credentials.ts";
import { overprovisionedSecrets } from "#/features/zizmor/rules/overprovisioned-secrets.ts";
import { secretsInherit } from "#/features/zizmor/rules/secrets-inherit.ts";
import { secretsOutsideEnv } from "#/features/zizmor/rules/secrets-outside-env.ts";
import { unredactedSecrets } from "#/features/zizmor/rules/unredacted-secrets.ts";
import { useTrustedPublishing } from "#/features/zizmor/rules/use-trusted-publishing.ts";

export const CREDENTIALS: readonly Audit[] = [
  artipacked,
  secretsInherit,
  secretsOutsideEnv,
  overprovisionedSecrets,
  unredactedSecrets,
  hardcodedContainerCredentials,
  githubApp,
  useTrustedPublishing,
];
