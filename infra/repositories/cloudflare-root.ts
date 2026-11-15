import { deleteToken, listTokens } from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext } from "@distilled.cloud/cloudflare/accounts";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import {
  DateTime,
  Effect,
  Layer,
  Option,
  Redacted,
  Stream,
  String as Str,
  flow,
  pipe,
} from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { CREDENTIAL_BROKER_AUDIENCE } from "./broker-names.ts";

export const ISSUED_TOKEN_PREFIX = `${CREDENTIAL_BROKER_AUDIENCE}:`;

export type RootEnv = Readonly<{ ROOT_TOKEN: SecretsStoreSecret }>;

const rootToken = (env: RootEnv): Effect.Effect<string> =>
  Effect.promise(() => env.ROOT_TOKEN.get());

/** @internal */
export const cloudflare: (env: RootEnv) => Layer.Layer<CloudflareOpContext> = flow(
  rootToken,
  Effect.map((apiToken) =>
    Layer.mergeAll(fromApiToken({ apiToken: Redacted.make(apiToken) }), fetchHttpClient),
  ),
  Layer.unwrap,
);

/** @internal */
export const sweepIssuedTokens = (
  accountId: string,
): Effect.Effect<void, never, CloudflareOpContext> =>
  Effect.gen(function* sweepExpired() {
    const now = yield* DateTime.now;
    const expired = yield* pipe(
      listTokens.items({ accountId }),
      Stream.filter(
        (token) =>
          Str.startsWith(ISSUED_TOKEN_PREFIX)(token.name ?? "") &&
          Option.exists(DateTime.make(token.expiresOn ?? ""), DateTime.isLessThan(now)),
      ),
      Stream.runCollect,
    );
    yield* pipe(
      expired,
      Effect.forEach((token) => deleteToken({ accountId, tokenId: token.id ?? "" })),
    );
    yield* Effect.logInfo("credential.swept").pipe(Effect.annotateLogs({ count: expired.length }));
  }).pipe(Effect.catchCause((cause) => Effect.logError("credential.sweep_failed", cause)));
