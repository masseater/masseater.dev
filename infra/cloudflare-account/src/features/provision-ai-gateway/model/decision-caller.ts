import { ApiToken, CloudflareEnvironment } from "@alchemy.run/cloudflare";
import { Effect } from "effect";

export const decisionCaller = Effect.fn("decisionCaller")(function* decisionCaller(
  appName: string,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  return yield* ApiToken.AccountApiToken("DecisionCaller", {
    name: `${appName}-decision-caller`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: ["Workers AI Read"],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
    ],
  });
});
