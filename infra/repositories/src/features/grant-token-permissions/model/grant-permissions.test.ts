import { expect, test } from "vite-plus/test";

import { missingGroupIds, policiesWith } from "./grant-permissions.ts";

const ACCOUNT_RESOURCE = { "com.cloudflare.api.account.acct": "*" };

const CATALOG = [
  { id: "g-ai-read", name: "Workers AI Read" },
  { id: "g-gateway-run", name: "AI Gateway Run" },
  { id: "g-d1-read", name: "D1 Read" },
];

const POLICIES = [
  {
    effect: "allow" as const,
    permissionGroups: [{ id: "g-d1-read", name: "D1 Read" }],
    resources: ACCOUNT_RESOURCE,
  },
];

test("持っていない権限グループの ID だけを返す", () => {
  expect(
    missingGroupIds({
      policies: POLICIES,
      catalog: CATALOG,
      names: ["D1 Read", "Workers AI Read", "AI Gateway Run"],
    }),
  ).toStrictEqual(["g-ai-read", "g-gateway-run"]);
});

test("カタログに無い名前は黙って飛ばす", () => {
  expect(
    missingGroupIds({ policies: POLICIES, catalog: CATALOG, names: ["No Such Group"] }),
  ).toStrictEqual([]);
});

test("既存の方針は ID だけに畳み、アカウント全体の許可を 1 つ足す", () => {
  expect(
    policiesWith({ policies: POLICIES, accountId: "acct", groupIds: ["g-ai-read"] }),
  ).toStrictEqual([
    { effect: "allow", permissionGroups: [{ id: "g-d1-read" }], resources: ACCOUNT_RESOURCE },
    { effect: "allow", permissionGroups: [{ id: "g-ai-read" }], resources: ACCOUNT_RESOURCE },
  ]);
});
