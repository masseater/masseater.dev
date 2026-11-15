import { Array as Arr, Option, pipe } from "effect";

import { ACCESS_SITES, ACCESS_TEAM_ORIGIN } from "./access-sites.ts";
import type { AccessSite } from "./access-sites.ts";

const TWILOG_ACCOUNTS = ["r_masseater", "u1_mas"] as const;

const TWILOG_ORIGIN = "https://twilog-mcp.togetter.dev";

const TWILOG_SCOPE = "twilog.read offline_access";

type TwilogAccount = (typeof TWILOG_ACCOUNTS)[number];

type TwilogTarget = `twilog/${TwilogAccount}`;

type OAuthTargetId = AccessSite | TwilogTarget;

type OAuthTarget = Readonly<{
  resource: string;
  issuer: string;
  scope: Option.Option<string>;
}>;

const twilogTarget = (account: TwilogAccount): TwilogTarget => `twilog/${account}`;

const OAUTH_TARGET_IDS: readonly OAuthTargetId[] = [
  ...ACCESS_SITES,
  ...pipe(TWILOG_ACCOUNTS, Arr.map(twilogTarget)),
];

const isTwilog = (id: OAuthTargetId): id is TwilogTarget =>
  pipe(TWILOG_ACCOUNTS, Arr.map(twilogTarget), Arr.contains(id));

const targetOf = (id: OAuthTargetId): OAuthTarget => {
  if (isTwilog(id)) {
    return {
      resource: `${TWILOG_ORIGIN}/mcp`,
      issuer: TWILOG_ORIGIN,
      scope: Option.some(TWILOG_SCOPE),
    };
  }
  return { resource: `https://${id}`, issuer: ACCESS_TEAM_ORIGIN, scope: Option.none() };
};

export { OAUTH_TARGET_IDS, TWILOG_ACCOUNTS, targetOf, twilogTarget };
export type { OAuthTarget, OAuthTargetId, TwilogAccount, TwilogTarget };
