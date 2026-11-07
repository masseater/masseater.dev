import { PERMISSION_GROUPS } from "@alchemy.run/cloudflare/ApiToken";
import type { PermissionGroupName } from "@alchemy.run/cloudflare/ApiToken";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

type Grant = Readonly<{
  account: readonly PermissionGroupName[];
  zone: readonly PermissionGroupName[];
}>;

const DEPLOY: Grant = {
  account: [
    "Account Settings Read",
    "Workers Scripts Write",
    "Workers Containers Write",
    "Workers KV Storage Write",
    "Workers R2 Storage Write",
    "Workers Observability Write",
    "Workers AI Read",
    "D1 Write",
    "Queues Write",
    "Vectorize Write",
    "Secrets Store Write",
  ],
  zone: ["Zone Read", "DNS Write", "Workers Routes Write"],
};

const extend = (extra: Partial<Grant>): Grant => ({
  account: [...DEPLOY.account, ...(extra.account ?? [])],
  zone: [...DEPLOY.zone, ...(extra.zone ?? [])],
});

const PROFILES = {
  deploy: DEPLOY,
  rulesets: extend({ account: ["Account Rulesets Write"] }),
  transforms: extend({ zone: ["Zone Transform Rules Write"] }),
  access: extend({ account: ["Access: Apps and Policies Write", "MCP Portals Write"] }),
} as const satisfies Readonly<Record<string, Grant>>;

const CREDENTIAL_GRANTS: Readonly<Record<string, keyof typeof PROFILES>> = {
  "ai-produced": "deploy",
  aredoko: "deploy",
  cdmm: "deploy",
  "decision-experiments": "rulesets",
  "geigeki-kaiiki": "deploy",
  konomi: "deploy",
  "medley-database": "deploy",
  "masseater.dev": "deploy",
  "masseater.dev/zone": "transforms",
  "masseater.dev/mcp-portal": "access",
  "medley-manager": "deploy",
  mirucord: "deploy",
  msa: "deploy",
  "personal-space": "access",
  "typescript-template": "deploy",
};

const GITHUB_APP_PERMISSIONS = {
  actions: "read",
  administration: "write",
  secrets: "write",
  actions_variables: "write",
  environments: "write",
  contents: "write",
  pull_requests: "write",
  metadata: "read",
} as const satisfies Readonly<Record<string, "read" | "write">>;

type GitHubGrant = Readonly<{
  permissions: Readonly<Record<string, string>>;
  repositories?: readonly string[];
}>;

const RELEASE_REPOSITORIES: readonly string[] = [
  "decision-experiments",
  "lint-kit",
  "measure-everything",
  "typescript-template",
];

const releaseGrant = (repository: string): readonly [string, GitHubGrant] => [
  repository,
  {
    permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    repositories: [repository],
  },
];

const GITHUB_GRANTS: Readonly<Record<string, GitHubGrant>> = {
  "masseater.dev/github": {
    permissions: {
      actions: "read",
      administration: "write",
      contents: "write",
      pull_requests: "write",
      secrets: "write",
      actions_variables: "write",
      environments: "write",
      metadata: "read",
    },
  },
  "masseater.dev/pod-rattle-release": {
    permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    repositories: ["masseater.dev"],
  },
  ...Rec.fromEntries(pipe(RELEASE_REPOSITORIES, Arr.map(releaseGrant))),
};

const NPM_GRANTS: readonly string[] = ["lint-kit", "measure-everything"];

const ATPROTO_GRANTS: readonly string[] = ["masseater.dev"];

const ACCOUNT_SCOPE = "com.cloudflare.api.account";
const ZONE_SCOPE = "com.cloudflare.api.account.zone";

type Policy = Readonly<{
  effect: "allow";
  permissionGroups: readonly Readonly<{ id: string }>[];
  resources: Readonly<Record<string, "*">>;
}>;

const groupId = (scope: string, name: PermissionGroupName): Readonly<{ id: string }> =>
  pipe(
    PERMISSION_GROUPS,
    Arr.findFirst((group) => group.name === name && Arr.contains(group.scopes, scope)),

    Option.map(({ id }) => ({ id })),
    Option.getOrThrowWith(() => new Error(`No ${scope} permission group named ${name}`)),
  );

const policy = (
  scope: string,
  resource: string,
  names: readonly PermissionGroupName[],
): Policy => ({
  effect: "allow",
  permissionGroups: pipe(
    names,
    Arr.map((name) => groupId(scope, name)),
  ),
  resources: { [resource]: "*" },
});

type Grants = Readonly<{
  profiles: Readonly<Record<string, readonly Policy[]>>;
  repositories: Readonly<Record<string, string>>;
  github: Readonly<Record<string, GitHubGrant>>;
  npm: readonly string[];
  atproto: readonly string[];
}>;

const grantPolicies = ({
  accountId,
  zoneId,
}: Readonly<{ accountId: string; zoneId: string }>): Grants => ({
  profiles: pipe(
    PROFILES,
    Rec.map((grant: Grant) => [
      policy(ACCOUNT_SCOPE, `${ACCOUNT_SCOPE}.${accountId}`, grant.account),
      policy(ZONE_SCOPE, `${ZONE_SCOPE}.${zoneId}`, grant.zone),
    ]),
  ),
  repositories: CREDENTIAL_GRANTS,
  github: GITHUB_GRANTS,
  npm: NPM_GRANTS,
  atproto: ATPROTO_GRANTS,
});

export { GITHUB_APP_PERMISSIONS, grantPolicies };
export type { GitHubGrant, Grants, Policy };
