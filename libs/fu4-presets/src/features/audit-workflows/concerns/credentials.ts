import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { artipacked } from "#/features/audit-workflows/rules/artipacked.ts";
import { githubApp } from "#/features/audit-workflows/rules/github-app.ts";
import { hardcodedContainerCredentials } from "#/features/audit-workflows/rules/hardcoded-container-credentials.ts";
import { overprovisionedSecrets } from "#/features/audit-workflows/rules/overprovisioned-secrets.ts";
import { secretsInherit } from "#/features/audit-workflows/rules/secrets-inherit.ts";
import { secretsOutsideEnv } from "#/features/audit-workflows/rules/secrets-outside-env.ts";
import { unredactedSecrets } from "#/features/audit-workflows/rules/unredacted-secrets.ts";
import { useTrustedPublishing } from "#/features/audit-workflows/rules/use-trusted-publishing.ts";

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
