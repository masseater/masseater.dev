import { Array as Arr, Option, Record as Rec, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { GITHUB_APP_PERMISSIONS, grantPolicies } from "./credential-grants.ts";

const CLOUDFLARE_ID = "0123456789abcdef0123456789abcdef";
const TEXT_BINDING_LIMIT = 5120;

const SCOPES = [
  { "com.cloudflare.api.account.account": "*" },
  { "com.cloudflare.api.account.zone.zone": "*" },
];

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

test("encoded grants stay under the Workers text binding limit", () => {
  const grants = grantPolicies({ accountId: CLOUDFLARE_ID, zoneId: CLOUDFLARE_ID });
  const encoded = pipe(
    encodeJson(grants),
    Option.map((json) => new TextEncoder().encode(json).length),
  );
  expect(Option.getOrThrow(encoded)).toBeLessThan(TEXT_BINDING_LIMIT);
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

const APP_PERMISSIONS: Readonly<Record<string, string>> = GITHUB_APP_PERMISSIONS;

test("every GitHub grant stays within the permissions the GitHub App asks for", () => {
  const { github, workflows } = grantPolicies({ accountId: "account", zoneId: "zone" });
  const granted = pipe(
    [
      ...Rec.values(github),
      ...pipe(
        Rec.values(workflows),
        Arr.map((permissions) => ({ permissions })),
      ),
    ],
    Arr.flatMap(({ permissions }) => Rec.toEntries(permissions)),
  );
  expect(
    pipe(
      granted,
      Arr.every(([name, level]) =>
        pipe(
          Rec.get(APP_PERMISSIONS, name),
          Option.exists((allowed) => allowed === "write" || allowed === level),
        ),
      ),
    ),
  ).toBe(true);
  expect(Arr.isReadonlyArrayNonEmpty(granted)).toBe(true);
});
