import { PERMISSION_GROUPS } from "@alchemy.run/cloudflare/ApiToken";
import { Array as Arr, Option, Record as Rec, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import {
  GITHUB_APP_PERMISSIONS,
  WORKFLOW_GITHUB_GRANTS,
  grantPolicies,
} from "./credential-grants.ts";

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

const DECISION_EXPERIMENTS = "masseater.dev/decision-experiments";

const RULE_GROUP_NAMES: readonly string[] = ["Account Rulesets Write", "Account Rule Lists Write"];

const RULE_GROUP_IDS = pipe(
  PERMISSION_GROUPS,
  Arr.filter(({ name }) => Arr.contains(RULE_GROUP_NAMES, name)),
  Arr.map(({ id }) => id),
);

test("decision-experiments の環境は deploy の権限グループだけを受け取り、ルールセットとリストは書けない", () => {
  const grants = grantPolicies({ accountId: "account", zoneId: "zone" });
  const granted = pipe(
    Rec.get(grants.repositories, DECISION_EXPERIMENTS),
    Option.flatMap((profile) => Rec.get(grants.profiles, profile)),
  );
  expect(granted).toStrictEqual(Rec.get(grants.profiles, "deploy"));
  expect(Option.isSome(granted)).toBe(true);
  expect(
    pipe(
      Option.getOrThrow(granted),
      Arr.flatMap(({ permissionGroups }) => permissionGroups),
      Arr.map(({ id }) => id),
      Arr.intersection(RULE_GROUP_IDS),
    ),
  ).toStrictEqual([]);
  expect(RULE_GROUP_IDS).toHaveLength(RULE_GROUP_NAMES.length);
});

const APP_PERMISSIONS: Readonly<Record<string, string>> = GITHUB_APP_PERMISSIONS;

test("every GitHub grant stays within the permissions the GitHub App asks for", () => {
  const { github } = grantPolicies({ accountId: "account", zoneId: "zone" });
  const workflows = WORKFLOW_GITHUB_GRANTS;
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
