import { ApiToken, CloudflareEnvironment, Workers } from "@alchemy.run/cloudflare";
import { listTokensPermissionGroups } from "@distilled.cloud/cloudflare/accounts";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

type WebAnalyticsTokenEnv = Readonly<{ WEB_ANALYTICS_TOKEN: string }>;

const webAnalyticsReader = Effect.fn("webAnalyticsReader")(function* webAnalyticsReader(
  appName: string,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const token = yield* ApiToken.AccountApiToken("WebAnalyticsReader", {
    name: `${appName}-web-analytics-reader`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: ["Account Analytics Read"],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
    ],
  });
  return yield* Workers.Worker("WebAnalyticsToken", {
    name: `${appName}-web-analytics-token`,
    main: decodeURIComponent(new URL("web-analytics-token.worker.ts", import.meta.url).pathname),
    logpush: true,
    workersDev: false,
    env: { WEB_ANALYTICS_TOKEN: token.value },
  });
});

const CLOUDFLARE_READER = "CloudflareReader";

const ACCOUNT_SCOPE = "com.cloudflare.api.account";
const ZONE_SCOPE = "com.cloudflare.api.account.zone";

const SUB_TOKEN_FORBIDDEN = new Set(["Account API Tokens Read"]);

const isReadPermission = (name: string): boolean =>
  Str.endsWith(" Read")(name) && !SUB_TOKEN_FORBIDDEN.has(name);

const cloudflareReader = Effect.fn("cloudflareReader")(function* cloudflareReader(appName: string) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const account = `${ACCOUNT_SCOPE}.${accountId}`;
  const groups = yield* listTokensPermissionGroups({ accountId }).pipe(Effect.orDie);
  const readable = pipe(
    groups,
    Arr.filter((group) => group.isSelectable !== false),
    Arr.filter((group) => isReadPermission(group.name ?? "")),
  );
  const readGroups = (scope: string): { id: string }[] =>
    pipe(
      readable,
      Arr.filter((group) => Arr.contains(group.scopes ?? [], scope)),
      Arr.flatMap(({ id }) =>
        pipe(
          Option.fromNullishOr(id),
          Option.map((groupId) => ({ id: groupId })),
          Option.toArray,
        ),
      ),
    );
  return yield* ApiToken.AccountApiToken(CLOUDFLARE_READER, {
    name: `${appName}-cloudflare-reader`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: readGroups(ACCOUNT_SCOPE),
        resources: { [account]: "*" },
      },
      {
        effect: "allow",
        permissionGroups: readGroups(ZONE_SCOPE),
        resources: { [account]: { [`${ZONE_SCOPE}.*`]: "*" } },
      },
    ],
  });
});

export type { WebAnalyticsTokenEnv };
export { cloudflareReader, webAnalyticsReader };
