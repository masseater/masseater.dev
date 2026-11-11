import {
  deleteToken as deleteAccountToken,
  getToken as getAccountToken,
  listTokens as listAccountTokens,
  verifyToken as verifyAccountToken,
} from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext } from "@distilled.cloud/cloudflare/accounts";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import type { DeleteTokenError as DeleteUserTokenError } from "@distilled.cloud/cloudflare/user";
import {
  deleteToken as deleteUserToken,
  getToken as getUserToken,
  listTokens as listUserTokens,
  verifyToken as verifyUserToken,
} from "@distilled.cloud/cloudflare/user";
import {
  Array as Arr,
  Cause,
  Config,
  Console,
  Effect,
  Layer,
  ManagedRuntime,
  Record as Rec,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { ISSUED_TOKEN_PREFIX } from "./cloudflare-root.ts";

type Token = Readonly<{
  id?: string | null;
  name?: string | null;
  status?: string | null;
  lastUsedOn?: string | null;
}>;

const isBrokerIssued = (token: Token): boolean =>
  Str.startsWith(ISSUED_TOKEN_PREFIX)(token.name ?? "");

const show =
  (scope: string) =>
  (token: Token): string =>
    pipe(
      [token.id, token.status, token.lastUsedOn, token.name],
      Arr.map((field) => field ?? "-"),
      Arr.prepend(scope),
      Arr.join("\t"),
    );

const lines = (scope: string, all: readonly Token[]): readonly string[] => {
  const issued = pipe(all, Arr.filter(isBrokerIssued));
  const others = pipe(
    all,
    Arr.filter((token) => !isBrokerIssued(token)),
    Arr.map(show(scope)),
  );
  return Arr.append(others, `${scope}\tbroker-issued\t${issued.length}`);
};

const inventory = <Failure>(
  scope: string,
  list: () => Stream.Stream<Token, Failure, CloudflareOpContext>,
): Effect.Effect<void, never, CloudflareOpContext> =>
  Stream.runCollect(list()).pipe(
    Effect.map((all) => lines(scope, all)),
    Effect.flatMap((output) => Console.log(Arr.join(output, "\n"))),
    Effect.catchCause((cause) => Console.log(`${scope}\tunavailable\t${Cause.pretty(cause)}`)),
  );

type Policy = Readonly<{
  effect: string;
  permissionGroups: readonly Readonly<{ id: string; name?: string | null }>[];
  resources: Readonly<Record<string, unknown>>;
}>;

const RESOURCE_ID = /[0-9a-f]{32}/gu;

const groupNames = (policy: Policy): string =>
  pipe(
    policy.permissionGroups,
    Arr.map((group) => group.name ?? group.id),
    Arr.join(","),
  );

const resourceKinds = (policy: Policy): string =>
  pipe(Rec.keys(policy.resources), Arr.join(","), Str.replaceAll(RESOURCE_ID, "<id>"));

const policyLine =
  (scope: string) =>
  (policy: Policy): string =>
    pipe([scope, "self", policy.effect, groupNames(policy), resourceKinds(policy)], Arr.join("\t"));

const policyLines = (scope: string, policies: readonly Policy[] | null | undefined): string =>
  pipe(policies ?? [], Arr.map(policyLine(scope)), Arr.join("\n"));

const ownPolicies = (accountId: string): Effect.Effect<void, never, CloudflareOpContext> =>
  verifyAccountToken({ accountId }).pipe(
    Effect.flatMap(({ id }) => getAccountToken({ accountId, tokenId: id })),
    Effect.map(({ policies }) => policyLines("account", policies)),
    Effect.catchCause(() =>
      verifyUserToken({}).pipe(
        Effect.flatMap(({ id }) => getUserToken({ tokenId: id })),
        Effect.map(({ policies }) => policyLines("user", policies)),
      ),
    ),
    Effect.catchCause((cause) => Effect.succeed(`self\tunavailable\t${Cause.pretty(cause)}`)),
    Effect.flatMap((output) => Console.log(output)),
  );

const revokeUserToken = (
  tokenId: string,
): Effect.Effect<string, DeleteUserTokenError, CloudflareOpContext> =>
  deleteUserToken({ tokenId }).pipe(Effect.as(`user\t${tokenId}\tdeleted`));

const revoke = (
  accountId: string,
  tokenId: string,
): Effect.Effect<void, never, CloudflareOpContext> =>
  deleteAccountToken({ accountId, tokenId }).pipe(
    Effect.as(`account\t${tokenId}\tdeleted`),
    Effect.catchCause(() => revokeUserToken(tokenId)),
    Effect.catchCause((cause) => Effect.succeed(`-\t${tokenId}\tfailed\t${Cause.pretty(cause)}`)),
    Effect.flatMap((line) => Console.log(line)),
  );

const program = Effect.gen(function* tokens() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const deleteTokenIds = yield* Config.String("DELETE_TOKEN_IDS").pipe(Config.withDefault(""));
  const targets = pipe(
    deleteTokenIds,
    Str.split(","),
    Arr.map(Str.trim),
    Arr.filter(Str.isNonEmpty),
  );
  yield* pipe(
    targets,
    Effect.forEach((tokenId) => revoke(accountId, tokenId)),
  );
  yield* ownPolicies(accountId);
  yield* inventory("account", () => listAccountTokens.items({ accountId }));
  yield* inventory("user", () => listUserTokens.items({}));
});

const cloudflare = Layer.unwrap(
  Config.Redacted("CLOUDFLARE_API_TOKEN").pipe(
    Effect.map((apiToken) => Layer.mergeAll(fromApiToken({ apiToken }), fetchHttpClient)),
  ),
);

const fail = (cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  Console.error(Cause.pretty(cause)).pipe(
    Effect.andThen(
      Effect.sync(() => {
        process.exitCode = 1;
      }),
    ),
  );

ManagedRuntime.make(cloudflare).runFork(program.pipe(Effect.catchCause(fail)));
