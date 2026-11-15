import { Array as Arr, pipe } from "effect";

import { finding } from "./fingerprint.ts";
import type { Finding, Scene } from "./fingerprint.ts";
import type { AccessApp, AccessPolicy, Inventory } from "./inventory.ts";
import { accessApps, isCovered, routeHost } from "./surface.ts";

const ALLOWING_DECISIONS: readonly string[] = ["allow"];
const RESTRICTING_DECISIONS: readonly string[] = ["deny"];
const OWNER_RULES: readonly string[] = ["email", "emailList", "group"];

const isServed =
  (inventory: Inventory) =>
  (host: string): boolean =>
    pipe(
      inventory.domains,
      Arr.some((domain) => domain.hostname === host),
    ) ||
    pipe(
      inventory.routes,
      Arr.some((route) => routeHost(route.pattern) === host),
    ) ||
    pipe(
      inventory.records,
      Arr.some((record) => record.name === host),
    );

const missingAccess = ({ inventory, surface }: Scene): readonly Finding[] =>
  pipe(
    surface.hosts,
    Arr.filter(isServed(inventory)),
    Arr.filter((host) => !isCovered(inventory)(host)),
    Arr.map((host) =>
      finding({
        kind: "access-missing",
        subject: host,
        detail: `${host} を丸ごと守る Access のアプリが無い`,
      }),
    ),
  );

const isOwnerOnly = (policy: AccessPolicy): boolean =>
  Arr.contains(ALLOWING_DECISIONS, policy.decision) &&
  Arr.isReadonlyArrayNonEmpty(policy.include) &&
  pipe(
    policy.include,
    Arr.every((rule) => Arr.contains(OWNER_RULES, rule)),
  );

const isOpenPolicy = (policy: AccessPolicy): boolean =>
  !Arr.contains(RESTRICTING_DECISIONS, policy.decision) && !isOwnerOnly(policy);

const openPolicies = (app: AccessApp): readonly Finding[] =>
  pipe(
    app.policies,
    Arr.filter(isOpenPolicy),
    Arr.map((policy) =>
      finding({
        kind: "access-policy",
        subject: `${app.name}/${policy.name}`,
        detail: `Access のアプリ ${app.name} のポリシー ${policy.name}（${policy.decision}、${Arr.join(policy.include, "・")}）が持ち主以外を通す`,
      }),
    ),
  );

const publicOverrides = (app: AccessApp): readonly Finding[] =>
  pipe(
    app.publicPaths,
    Arr.map((path) =>
      finding({
        kind: "access-override",
        subject: `${app.name}${path}`,
        detail: `Access のアプリ ${app.name} が ${path} を認証なしで通す`,
      }),
    ),
  );

export const accessFindings = (scene: Scene): readonly Finding[] => [
  ...missingAccess(scene),
  ...pipe(accessApps(scene.inventory), Arr.flatMap(openPolicies)),
  ...pipe(accessApps(scene.inventory), Arr.flatMap(publicOverrides)),
];
