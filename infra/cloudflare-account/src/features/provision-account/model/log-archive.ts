import { ApiToken, CloudflareEnvironment, Logpush } from "@alchemy.run/cloudflare";
import type { R2 } from "@alchemy.run/cloudflare";
import { all, map, mapEffect } from "alchemy/Output";
import { sha256 } from "alchemy/Util";
import { Effect, Option, Redacted } from "effect";

import { japanBucket, japanBucketName } from "#/shared/api/index.ts";

const RETENTION_DAYS = 30;

const ABORT_MULTIPART_DAYS = 7;

const SECONDS_PER_DAY = 86_400;

const LIFECYCLE_RULES: R2.BucketLifecycleRule[] = [
  {
    id: "expire",
    deleteObjectsTransition: {
      condition: { type: "Age", maxAge: RETENTION_DAYS * SECONDS_PER_DAY },
    },
  },
  {
    id: "abort-multipart",
    abortMultipartUploadsTransition: {
      condition: { type: "Age", maxAge: ABORT_MULTIPART_DAYS * SECONDS_PER_DAY },
    },
  },
];

const NORMAL_SAMPLE_RATE = 0.01;

const ARCHIVES = [
  {
    id: "WorkerFailures",
    prefix: "failures",
    filter: '{"where":{"key":"Outcome","operator":"!eq","value":"ok"}}',
    sampleRate: 1,
  },
  { id: "WorkerSample", prefix: "sample", filter: "", sampleRate: NORMAL_SAMPLE_RATE },
] as const;

const FIELD_NAMES = [
  "EventTimestampMs",
  "EventType",
  "Event",
  "Outcome",
  "ScriptName",
  "Logs",
  "Exceptions",
];

const DEFAULT_JURISDICTION = "default";

const bucketNameOf = (appName: string): string => `${appName}-worker-logs`;

const writerToken = Effect.fn("writerToken")(function* writerToken(appName: string) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const bucketKey = `${accountId}_${DEFAULT_JURISDICTION}_${japanBucketName(bucketNameOf(appName))}`;
  return yield* ApiToken.AccountApiToken("WorkerLogsWriter", {
    name: `${appName}-worker-logs-writer`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: ["Workers R2 Storage Bucket Item Write"],
        resources: { [`com.cloudflare.edge.r2.bucket.${bucketKey}`]: "*" },
      },
    ],
  });
});

export const logArchive = Effect.fn("logArchive")(function* logArchive(appName: string) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const bucket = yield* japanBucket("WorkerLogs", {
    name: bucketNameOf(appName),
    lifecycleRules: Option.some(LIFECYCLE_RULES),
  });
  const token = yield* writerToken(appName);
  const credentials = all(token.tokenId, token.value, bucket.bucketName).pipe(
    mapEffect(([tokenId, value, bucketName]) =>
      value.pipe(
        Redacted.value,
        sha256,
        Effect.map((secretAccessKey) => ({ tokenId, bucketName, secretAccessKey })),
      ),
    ),
  );
  return yield* Effect.forEach(
    ARCHIVES,
    ({ id, prefix, filter, sampleRate }) =>
      Logpush.Job(id, {
        name: `${appName}-${prefix}-logs`,
        dataset: "workers_trace_events",
        destinationConf: credentials.pipe(
          map(
            ({ tokenId, bucketName, secretAccessKey }) =>
              `r2://${bucketName}/${prefix}/{DATE}?account-id=${accountId}&access-key-id=${tokenId}&secret-access-key=${secretAccessKey}`,
          ),
        ),
        enabled: true,
        filter,
        outputOptions: {
          fieldNames: FIELD_NAMES,
          outputType: "ndjson",
          sampleRate,
          timestampFormat: "rfc3339",
        },
      }),
    { concurrency: 1 },
  );
});
