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

const BUILDS_LOGS: Grant = {
  account: ["Workers CI Read", "Workers Scripts Read", "Workers R2 Storage Write"],
  zone: [],
};

const EXPOSURE: Grant = {
  account: [
    "Access: Apps and Policies Read",
    "MCP Portals Read",
    "Workers Scripts Read",
    "Workers R2 Storage Read",
    "Pages Read",
  ],
  zone: ["Zone Read", "DNS Read", "Workers Routes Read"],
};

const PROFILES = {
  deploy: DEPLOY,
  transforms: extend({ zone: ["Zone Transform Rules Write"] }),
  access: extend({ account: ["Access: Apps and Policies Write", "MCP Portals Write"] }),
  buildsLogs: BUILDS_LOGS,
  exposure: EXPOSURE,
} as const satisfies Readonly<Record<string, Grant>>;

const CREDENTIAL_GRANTS: Readonly<Record<string, keyof typeof PROFILES>> = {
  "1403864815": "access",
  "ai-produced": "deploy",
  cdmm: "deploy",
  "geigeki-kaiiki": "deploy",
  konomi: "deploy",
  "masseater.dev": "deploy",
  "masseater.dev/decision-experiments": "deploy",
  "masseater.dev/exposure": "exposure",
  "masseater.dev/kikite": "access",
  "masseater.dev/zone": "transforms",
  "masseater.dev/mcp-portal": "access",
  "masseater.dev/money": "access",
  "masseater.dev/plamo-translate": "access",
  "masseater.dev/portal": "access",
  "masseater.dev/yohaku-sync": "access",
  "masseater.dev/sundries": "access",
  "masseater.dev/twilog-mcp": "access",
  "masseater.dev/workers-builds-logs": "buildsLogs",
  mirucord: "deploy",
  msa: "deploy",
  "typescript-template": "deploy",
};

type PermissionLevel = "read" | "write";

const GITHUB_APP_PERMISSIONS = {
  actions: "read",
  administration: "write",
  secrets: "write",
  actions_variables: "write",
  environments: "write",
  contents: "write",
  pull_requests: "write",
  metadata: "read",
} as const satisfies Readonly<Record<string, PermissionLevel>>;

type GitHubGrant = Readonly<{
  permissions: Readonly<Record<string, string>>;
  repositories?: readonly string[];
}>;

const RELEASE_REPOSITORIES: readonly string[] = ["lint-kit", "typescript-template"];

const RELEASE_COMPONENTS: readonly string[] = ["pod-rattle", "yakusu", "yohaku"];

const releaseGrant = (repository: string): readonly [string, GitHubGrant] => [
  repository,
  {
    permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    repositories: [repository],
  },
];

const [, MASSEATER_DEV_GITHUB_GRANT] = releaseGrant("masseater.dev");

const GITHUB_GRANTS: Readonly<Record<string, GitHubGrant>> = {
  "masseater.dev/exposure": { permissions: { metadata: "read" } },
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
  "masseater.dev/private-names": { permissions: { metadata: "read" } },
  ...Rec.fromEntries(
    pipe(
      RELEASE_COMPONENTS,
      Arr.map((component) => [`masseater.dev/${component}-release`, MASSEATER_DEV_GITHUB_GRANT]),
    ),
  ),
  ...Rec.fromEntries(pipe(RELEASE_REPOSITORIES, Arr.map(releaseGrant))),
};

const BOT_PERMISSIONS = {
  contents: "write",
  pull_requests: "write",
  metadata: "read",
} as const satisfies Readonly<Record<string, PermissionLevel>>;

const WORKFLOW_GITHUB_GRANTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "autofix.yml": BOT_PERMISSIONS,
  "skills-lock.yml": BOT_PERMISSIONS,
  "update-branches.yml": BOT_PERMISSIONS,
};

const NPM_GRANTS: readonly string[] = ["masseater.dev/npm"];

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
    Rec.map((grant: Grant) =>
      pipe(
        [
          policy(ACCOUNT_SCOPE, `${ACCOUNT_SCOPE}.${accountId}`, grant.account),
          policy(ZONE_SCOPE, `${ZONE_SCOPE}.${zoneId}`, grant.zone),
        ],
        Arr.filter(({ permissionGroups }) => Arr.isReadonlyArrayNonEmpty(permissionGroups)),
      ),
    ),
  ),
  repositories: CREDENTIAL_GRANTS,
  github: GITHUB_GRANTS,
  npm: NPM_GRANTS,
  atproto: ATPROTO_GRANTS,
});

type GrantBindings = Readonly<{
  GRANT_PROFILES: Grants["profiles"];
  GRANTS: Omit<Grants, "profiles">;
}>;

const grantBindings = (ids: Readonly<{ accountId: string; zoneId: string }>): GrantBindings => {
  const { profiles, ...grants } = grantPolicies(ids);
  return { GRANT_PROFILES: profiles, GRANTS: grants };
};

export {
  GITHUB_APP_PERMISSIONS,
  MASSEATER_DEV_GITHUB_GRANT,
  WORKFLOW_GITHUB_GRANTS,
  grantBindings,
  grantPolicies,
};
export type { GitHubGrant, GrantBindings, Grants, Policy };
