import { ApiToken, CloudflareEnvironment, Workers } from "@alchemy.run/cloudflare";
import { Effect } from "effect";

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

export type { WebAnalyticsTokenEnv };
export { webAnalyticsReader };
