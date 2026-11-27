import { ApiToken, CloudflareEnvironment, R2 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { mapEffect } from "alchemy/Output";
import type { Output } from "alchemy/Output";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { sha256 } from "alchemy/Util";
import { Effect, Option, Redacted } from "effect";

import { JAPAN_BUCKET_HINT } from "#/shared/config/index.ts";

import { emptyAfterVerifying, slurpObjects } from "./bucket-objects.ts";
import type { BucketRoute, SlurperCredentials } from "./bucket-objects.ts";

const COPY_OBJECTS = "Masseater.CopyObjects";

type CopyObjectsProps = Readonly<{
  accountId: string;
  source: string;
  target: string;
  accessKeyId: string;
  secretAccessKey: string;
}>;

type CopyObjectsResource = Resource<typeof COPY_OBJECTS, CopyObjectsProps, CopyObjectsProps>;

const CopyObjects = Resource<CopyObjectsResource>(COPY_OBJECTS);

export type BucketMover = Readonly<{
  accessKeyId: Output<string>;
  secretAccessKey: Output<string>;
}>;

export interface JapanBucketProps {
  readonly name: string;
  readonly mover?: BucketMover;
  readonly lifecycleRules: Option.Option<readonly R2.BucketLifecycleRule[]>;
}

const rulesOf = (
  rules: Option.Option<readonly R2.BucketLifecycleRule[]>,
): { readonly lifecycleRules?: R2.BucketLifecycleRule[] } =>
  Option.match(rules, {
    onNone: () => ({}),
    onSome: (some) => ({ lifecycleRules: [...some] }),
  });

const credentialsOf = ({ accessKeyId, secretAccessKey }: CopyObjectsProps): SlurperCredentials => ({
  accessKeyId,
  secretAccessKey,
});

const routeOf = ({ accountId, source, target }: BucketRoute): BucketRoute => ({
  accountId,
  source,
  target,
});

/** @internal */
export const copyObjectsProvider = succeed(CopyObjects, {
  reconcile: ({ news }) => slurpObjects(routeOf(news), credentialsOf(news)).pipe(Effect.as(news)),
  delete: ({ output }) => emptyAfterVerifying(routeOf(output)),
});

const BUCKET_MOVER = "BucketMover";

const secretKeyOf = mapEffect((value: Redacted.Redacted) => value.pipe(Redacted.value, sha256));

const moverKeysOf = (
  token: Readonly<{ tokenId: Output<string>; value: Output<Redacted.Redacted> }>,
): BucketMover => ({
  accessKeyId: token.tokenId,
  secretAccessKey: secretKeyOf(token.value),
});

export const provisionBucketMover = Effect.fn("provisionBucketMover")(
  function* provisionBucketMover(appName: string) {
    const { accountId } = yield* yield* CloudflareEnvironment;
    const token = yield* ApiToken.AccountApiToken(BUCKET_MOVER, {
      name: `${appName}-bucket-mover`,
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers R2 Storage Bucket Item Read",
            "Workers R2 Storage Bucket Item Write",
          ],
          resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
        },
      ],
    });
    return moverKeysOf(token);
  },
);

export const referBucketMover = Effect.fn("referBucketMover")(function* referBucketMover() {
  const token = yield* ApiToken.AccountApiToken.ref(BUCKET_MOVER, {
    stack: "masseater-dev",
    stage: "prod",
  });
  return moverKeysOf(token);
});

export const japanBucketName = (name: string): string => `${name}-japan`;

export const japanBucket = Effect.fn("japanBucket")(function* japanBucket(
  id: string,
  { name, lifecycleRules, mover }: JapanBucketProps,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const keys = mover ?? (yield* referBucketMover());
  const legacy = yield* R2.Bucket(id, { name, ...rulesOf(lifecycleRules) }).pipe(
    RemovalPolicy.destroy(),
  );
  const japan = yield* R2.Bucket(`${id}Japan`, {
    name: japanBucketName(name),
    locationHint: JAPAN_BUCKET_HINT,
    ...rulesOf(lifecycleRules),
  }).pipe(RemovalPolicy.protect());
  yield* CopyObjects(`${id}Objects`, {
    accountId,
    source: legacy.bucketName,
    target: japan.bucketName,
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
  });
  return japan;
});
