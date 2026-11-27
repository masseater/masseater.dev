import { ApiToken, CloudflareEnvironment, R2 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { mapEffect } from "alchemy/Output";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { sha256 } from "alchemy/Util";
import { Effect, Option, Redacted } from "effect";

import { JAPAN_BUCKET_HINT } from "#/shared/config/index.ts";

import { emptyAfterVerifying, slurpObjects } from "./bucket-objects.ts";
import type { BucketRoute } from "./bucket-objects.ts";

const COPY_OBJECTS = "Masseater.CopyObjects";

const DEFAULT_JURISDICTION = "default";

type CopyObjectsProps = Readonly<{
  accountId: string;
  source: string;
  target: string;
  accessKeyId: string;
  secretAccessKey: string;
}>;

type CopyObjectsResource = Resource<typeof COPY_OBJECTS, CopyObjectsProps, CopyObjectsProps>;

const CopyObjects = Resource<CopyObjectsResource>(COPY_OBJECTS);

export interface JapanBucketProps {
  readonly name: string;
  readonly lifecycleRules: Option.Option<readonly R2.BucketLifecycleRule[]>;
}

const rulesOf = (
  rules: Option.Option<readonly R2.BucketLifecycleRule[]>,
): { readonly lifecycleRules?: R2.BucketLifecycleRule[] } =>
  Option.match(rules, {
    onNone: () => ({}),
    onSome: (some) => ({ lifecycleRules: [...some] }),
  });

const routeOf = ({ accountId, source, target }: BucketRoute): BucketRoute => ({
  accountId,
  source,
  target,
});

/** @internal */
export const copyObjectsProvider = succeed(CopyObjects, {
  reconcile: ({ news }) => slurpObjects(routeOf(news), news).pipe(Effect.as(news)),
  delete: ({ output }) => emptyAfterVerifying(routeOf(output)),
});

const resourceKeyOf = (accountId: string, bucketName: string): string =>
  `com.cloudflare.edge.r2.bucket.${accountId}_${DEFAULT_JURISDICTION}_${bucketName}`;

export const japanBucketName = (name: string): string => `${name}-japan`;

export const japanBucket = Effect.fn("japanBucket")(function* japanBucket(
  id: string,
  { name, lifecycleRules }: JapanBucketProps,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const legacy = yield* R2.Bucket(id, { name, ...rulesOf(lifecycleRules) }).pipe(
    RemovalPolicy.destroy(),
  );
  const japanName = japanBucketName(name);
  const japan = yield* R2.Bucket(`${id}Japan`, {
    name: japanName,
    locationHint: JAPAN_BUCKET_HINT,
    ...rulesOf(lifecycleRules),
  }).pipe(RemovalPolicy.protect());
  const token = yield* ApiToken.AccountApiToken(`${id}Mover`, {
    name: `${name}-mover`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: [
          "Workers R2 Storage Bucket Item Read",
          "Workers R2 Storage Bucket Item Write",
        ],
        resources: {
          [resourceKeyOf(accountId, name)]: "*",
          [resourceKeyOf(accountId, japanName)]: "*",
        },
      },
    ],
  });
  yield* CopyObjects(`${id}Objects`, {
    accountId,
    source: legacy.bucketName,
    target: japan.bucketName,
    accessKeyId: token.tokenId,
    secretAccessKey: token.value.pipe(mapEffect((value) => value.pipe(Redacted.value, sha256))),
  });
  return japan;
});
