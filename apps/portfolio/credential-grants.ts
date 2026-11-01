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

const CREDENTIAL_GRANTS: Readonly<Record<string, Grant>> = {
  "ai-produced": DEPLOY,
  aredoko: DEPLOY,
  cdmm: DEPLOY,
  "decision-experiments": DEPLOY,
  "masseater.dev": extend({
    account: ["Account Rulesets Write", "Logs Write", "Account API Tokens Write"],
    zone: ["Zone WAF Write", "Logs Write"],
  }),
  "medley-database": DEPLOY,
  "medley-manager": DEPLOY,
  mirucord: DEPLOY,
  msa: DEPLOY,
  "mst-ja-decision-bench": extend({ account: ["Account Rulesets Write"] }),
  myaudiobooks: DEPLOY,
  "personal-space": extend({
    account: ["Access: Apps and Policies Write", "MCP Portals Write"],
  }),
  "thumb-mosaic": DEPLOY,
  "typescript-template": DEPLOY,
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

const grantPolicies = ({
  accountId,
  zoneId,
}: Readonly<{ accountId: string; zoneId: string }>): Readonly<Record<string, readonly Policy[]>> =>
  pipe(
    CREDENTIAL_GRANTS,
    Rec.map((grant) => [
      policy(ACCOUNT_SCOPE, `${ACCOUNT_SCOPE}.${accountId}`, grant.account),
      policy(ZONE_SCOPE, `${ZONE_SCOPE}.${zoneId}`, grant.zone),
    ]),
  );

export { grantPolicies };
export type { Policy };
