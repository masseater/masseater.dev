import { Array as Arr, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { grantPolicies } from "./credential-grants.ts";

const SCOPES = [
  { "com.cloudflare.api.account.account": "*" },
  { "com.cloudflare.api.account.zone.zone": "*" },
];

test("every grant resolves to account and zone policies with known permission groups", () => {
  const policies = Rec.values(grantPolicies({ accountId: "account", zoneId: "zone" }));
  const resourcesOf = Arr.map((policy: (typeof policies)[number][number]) => policy.resources);
  expect(pipe(policies, Arr.map(resourcesOf))).toStrictEqual(
    pipe(
      policies,
      Arr.map(() => SCOPES),
    ),
  );
  expect(Arr.isReadonlyArrayNonEmpty(policies)).toBe(true);
});
