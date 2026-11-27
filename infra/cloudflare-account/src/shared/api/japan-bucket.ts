import { R2 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { Effect, Option } from "effect";

import { JAPAN_BUCKET_HINT } from "#/shared/config/index.ts";

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
