import { ApiToken, CloudflareEnvironment, Workers } from "@alchemy.run/cloudflare";
import { Effect } from "effect";

import { APP_NAME } from "./app-name.ts";

type WebAnalyticsTokenEnv = Readonly<{ WEB_ANALYTICS_TOKEN: string }>;

const webAnalyticsReader = Effect.fn("webAnalyticsReader")(function* webAnalyticsReader(
  compatibility: Readonly<{ date: string }>,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const token = yield* ApiToken.AccountApiToken("WebAnalyticsReader", {
    name: `${APP_NAME}-web-analytics-reader`,
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
    name: `${APP_NAME}-web-analytics-token`,
    main: "./web-analytics-token.worker.ts",
    compatibility,
    logpush: true,
    workersDev: false,
    env: { WEB_ANALYTICS_TOKEN: token.value },
  });
});

export type { WebAnalyticsTokenEnv };
export { webAnalyticsReader };
