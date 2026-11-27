import {
  getToken,
  listTokensPermissionGroups,
  updateToken,
} from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext, UpdateTokenRequest } from "@distilled.cloud/cloudflare/accounts";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { TokenNotGrantable } from "./token-not-grantable.ts";

const ACCOUNT_SCOPE = "com.cloudflare.api.account";

export type NextPolicies = UpdateTokenRequest["policies"];
export type HeldPolicy = Readonly<{
  effect: string;
  permissionGroups: readonly Readonly<{ id: string; name?: string | null | undefined }>[];
  resources: Readonly<
    Record<string, string | Readonly<Record<string, string | undefined>> | undefined>
  >;
}>;
type Candidate = Readonly<{
  status?: string | null | undefined;
  expiresOn?: string | null | undefined;
  condition?: Readonly<{ requestIp?: unknown }> | null | undefined;
}>;
export type HeldPolicies = readonly HeldPolicy[];
export type GroupCatalog = readonly Readonly<{
  id?: string | null | undefined;
  name?: string | null | undefined;
}>[];

const heldNames = (policies: HeldPolicies): readonly string[] =>
  pipe(
    policies,
    Arr.flatMap((policy) => policy.permissionGroups),
    Arr.map((group) => group.name ?? group.id),
  );

const idOf =
  (catalog: GroupCatalog) =>
  (name: string): readonly string[] =>
    pipe(
      catalog,
      Arr.findFirst((group) => group.name === name),
      Option.flatMapNullishOr((group) => group.id),
      Option.toArray,
    );

export const missingGroupIds = (input: {
  readonly policies: HeldPolicies;
  readonly catalog: GroupCatalog;
  readonly names: readonly string[];
}): readonly string[] => {
  const held = heldNames(input.policies);
  return pipe(
    input.names,
    Arr.filter((name) => !Arr.contains(held, name)),
    Arr.flatMap(idOf(input.catalog)),
  );
};

const reference = (id: string): { id: string } => ({ id });

const kept = (policy: HeldPolicy): NextPolicies[number] => ({
  effect: policy.effect,
  permissionGroups: pipe(
    policy.permissionGroups,
    Arr.map(({ id }) => reference(id)),
  ),
  resources: policy.resources,
});

const wholeAccount = (accountId: string): Record<string, string> => ({
  [`${ACCOUNT_SCOPE}.${accountId}`]: "*",
});

const references = (ids: readonly string[]): { id: string }[] => pipe(ids, Arr.map(reference));

export const policiesWith = (input: {
  readonly policies: HeldPolicies;
  readonly accountId: string;
  readonly groupIds: readonly string[];
}): NextPolicies =>
  pipe(
    input.policies,
    Arr.map(kept),
    Arr.append({
      effect: "allow",
      permissionGroups: references(input.groupIds),
      resources: wholeAccount(input.accountId),
    }),
  );

const isPlain = (token: Candidate): boolean =>
  token.status === "active" &&
  Option.isNone(Option.fromNullishOr(token.expiresOn)) &&
  Option.isNone(
    pipe(
      Option.fromNullishOr(token.condition),
      Option.flatMapNullishOr((condition) => condition.requestIp),
    ),
  );

/** @internal */
export const grantPermissions = ({
  accountId,
  tokenId,
  names,
}: {
  readonly accountId: string;
  readonly tokenId: string;
  readonly names: readonly string[];
}): Effect.Effect<readonly string[], TokenNotGrantable, CloudflareOpContext> =>
  Effect.gen(function* grant() {
    const token = yield* getToken({ accountId, tokenId }).pipe(Effect.orDie);
    const catalog = yield* listTokensPermissionGroups({ accountId }).pipe(Effect.orDie);
    if (!isPlain(token)) {
      return yield* TokenNotGrantable.make({
        reason: "only an active token without an IP condition or an expiry is updated",
      });
    }
    const policies = token.policies ?? [];
    const missing = missingGroupIds({ policies, catalog, names });
    if (Arr.isReadonlyArrayEmpty(missing)) {
      return missing;
    }
    yield* updateToken({
      accountId,
      tokenId,
      name: token.name ?? tokenId,
      status: "active",
      policies: policiesWith({ policies, accountId, groupIds: missing }),
    }).pipe(Effect.orDie);
    return missing;
  });
