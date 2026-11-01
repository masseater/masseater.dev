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
  access: extend({ account: ["Access: Apps and Policies Write", "MCP Portals Write"] }),
} as const satisfies Readonly<Record<string, Grant>>;

const CREDENTIAL_GRANTS: Readonly<Record<string, keyof typeof PROFILES>> = {
  "ai-produced": "deploy",
  aredoko: "deploy",
  cdmm: "deploy",
  "decision-experiments": "deploy",
  "medley-database": "deploy",
  "medley-manager": "deploy",
  mirucord: "deploy",
  msa: "deploy",
  "mst-ja-decision-bench": "rulesets",
  myaudiobooks: "deploy",
  "personal-space": "access",
  "thumb-mosaic": "deploy",
  "typescript-template": "deploy",
};

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
});

export { grantPolicies };
export type { Grants, Policy };
