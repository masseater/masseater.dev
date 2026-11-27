import { R2 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect, Option } from "effect";

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

export const japanBucketName = (name: string): string => `${name}-japan`;

export const japanBucket = Effect.fn("japanBucket")(function* japanBucket(
  id: string,
  { name, lifecycleRules }: JapanBucketProps,
) {
  return yield* R2.Bucket(`${id}Japan`, {
    name: japanBucketName(name),
    locationHint: JAPAN_BUCKET_HINT,
    ...rulesOf(lifecycleRules),
  }).pipe(RemovalPolicy.protect());
});
