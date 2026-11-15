import { PERMISSION_GROUPS } from "@alchemy.run/cloudflare/ApiToken";
import { Array as Arr, Option, Record as Rec, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import {
  GITHUB_APP_PERMISSIONS,
  WORKFLOW_GITHUB_GRANTS,
  grantBindings,
  grantPolicies,
} from "./credential-grants.ts";

const CLOUDFLARE_ID = "0123456789abcdef0123456789abcdef";
const TEXT_BINDING_LIMIT = 5120;

const ACCOUNT_RESOURCE = "com.cloudflare.api.account.account";
const SCOPES: readonly string[] = [ACCOUNT_RESOURCE, "com.cloudflare.api.account.zone.zone"];

const resourceKeys = Arr.flatMap(
  ({ resources }: Readonly<{ resources: Readonly<Record<string, string>> }>) => Rec.keys(resources),
);

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

test("each encoded grants binding stays under the Workers text binding limit", () => {
  const bindings = grantBindings({ accountId: CLOUDFLARE_ID, zoneId: CLOUDFLARE_ID });
  const sizes = pipe(
    bindings,
    Rec.map((value: unknown) =>
      pipe(
        encodeJson(value),
        Option.map((json) => new TextEncoder().encode(json).length),
        Option.getOrThrow,
      ),
    ),
  );
  expect(
    pipe(
      sizes,
      Rec.every((size) => size < TEXT_BINDING_LIMIT),
    ),
  ).toBe(true);
});

test("every grant resolves to account and zone policies with known permission groups", () => {
  const grants = grantPolicies({ accountId: "account", zoneId: "zone" });
  const policies = pipe(Rec.values(grants.profiles), Arr.flatten);
  expect(
    pipe(
      policies,
      Arr.every(({ permissionGroups }) => Arr.isReadonlyArrayNonEmpty(permissionGroups)),
    ),
  ).toBe(true);
  expect(pipe(resourceKeys(policies), Arr.difference(SCOPES))).toStrictEqual([]);
  expect(Arr.isReadonlyArrayNonEmpty(policies)).toBe(true);
  expect(
    pipe(
      Rec.values(grants.repositories),
      Arr.every((profile) => Rec.has(grants.profiles, profile)),
    ),
  ).toBe(true);
});

test("a profile without zone permissions issues no zone policy", () => {
  const grants = grantPolicies({ accountId: "account", zoneId: "zone" });
  const buildsLogs = Rec.get(grants.profiles, "buildsLogs");
  expect(pipe(buildsLogs, Option.map(resourceKeys))).toStrictEqual(Option.some([ACCOUNT_RESOURCE]));
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
