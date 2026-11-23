import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { artipacked } from "#/features/audit-workflows/model/rules/artipacked.ts";
import { githubApp } from "#/features/audit-workflows/model/rules/github-app.ts";
import { hardcodedContainerCredentials } from "#/features/audit-workflows/model/rules/hardcoded-container-credentials.ts";
import { overprovisionedSecrets } from "#/features/audit-workflows/model/rules/overprovisioned-secrets.ts";
import { secretsInherit } from "#/features/audit-workflows/model/rules/secrets-inherit.ts";
import { secretsOutsideEnv } from "#/features/audit-workflows/model/rules/secrets-outside-env.ts";
import { unredactedSecrets } from "#/features/audit-workflows/model/rules/unredacted-secrets.ts";
import { useTrustedPublishing } from "#/features/audit-workflows/model/rules/use-trusted-publishing.ts";

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
