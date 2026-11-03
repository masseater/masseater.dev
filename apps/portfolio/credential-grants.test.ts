import { Array as Arr, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { grantPolicies } from "./credential-grants.ts";

const CLOUDFLARE_ID = "0123456789abcdef0123456789abcdef";
const TEXT_BINDING_LIMIT = 5120;

const SCOPES = [
  { "com.cloudflare.api.account.account": "*" },
  { "com.cloudflare.api.account.zone.zone": "*" },
];

test("encoded grants stay under the Workers text binding limit", () => {
  const grants = grantPolicies({ accountId: CLOUDFLARE_ID, zoneId: CLOUDFLARE_ID });
  expect(new TextEncoder().encode(JSON.stringify(grants)).length).toBeLessThan(TEXT_BINDING_LIMIT);
});

test("every grant resolves to account and zone policies with known permission groups", () => {
  const grants = grantPolicies({ accountId: "account", zoneId: "zone" });
  const policies = Rec.values(grants.profiles);
  const resourcesOf = Arr.map((policy: (typeof policies)[number][number]) => policy.resources);
  expect(pipe(policies, Arr.map(resourcesOf))).toStrictEqual(
    pipe(
      policies,
      Arr.map(() => SCOPES),
    ),
  );
  expect(Arr.isReadonlyArrayNonEmpty(policies)).toBe(true);
  expect(
    pipe(
      Rec.values(grants.repositories),
      Arr.every((profile) => Rec.has(grants.profiles, profile)),
    ),
  ).toBe(true);
});
