import { ApiToken, CloudflareEnvironment, Providers, R2 } from "@alchemy.run/cloudflare";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import { Stack, isResourceOfType } from "alchemy";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { Array as Arr, Effect, Layer, Option, Record as Rec, Redacted, Schema, pipe } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";
import { expect, test } from "vite-plus/test";

import { copyObjectsProvider, provisionBucketMover } from "#/shared/api/index.ts";

import { logArchive } from "./log-archive.ts";

const APP_NAME = "example";
const ACCOUNT_ID = "0123456789abcdef0123456789abcdef";
const BUCKET_NAME = `${APP_NAME}-worker-logs`;
const JAPAN_BUCKET_NAME = `${BUCKET_NAME}-japan`;

const Declared = Schema.Struct({
  name: Schema.String,
  jurisdiction: Schema.optional(Schema.String),
  policies: Schema.optional(Schema.Unknown),
});

const Lifecycle = Schema.Struct({
  lifecycleRules: Schema.Array(Schema.Struct({ id: Schema.String })),
});

const decodeLifecycle = (props: unknown): Option.Option<typeof Lifecycle.Type> =>
  Schema.decodeUnknownOption(Lifecycle)(props);

const decodeProps = Schema.decodeUnknownOption(Declared);

const UNUSED_TOKEN = Redacted.make("unused");

const ENVIRONMENT = Effect.succeed({
  type: "apiToken" as const,
  apiToken: UNUSED_TOKEN,
  accountId: ACCOUNT_ID,
  source: { type: "env" as const },
});

const archive = provisionBucketMover(APP_NAME).pipe(
  Effect.flatMap((mover) => logArchive(APP_NAME, mover)),
  Effect.provideService(CloudflareEnvironment, ENVIRONMENT),
);

const REGISTERED: Readonly<Record<string, never>> = {};

const CLOUDFLARE = Layer.mergeAll(fromApiToken({ apiToken: UNUSED_TOKEN }), fetchHttpClient);

const NO_PROVIDERS = copyObjectsProvider.pipe(
  Layer.provide(CLOUDFLARE),
  Layer.provideMerge(
    Layer.succeed(Providers, {
      kind: "ProviderCollection",
      get: (service: string) => REGISTERED[service],
      providers: REGISTERED,
    }),
  ),
);

const declaredWith =
  <Decoded>(decode: (props: unknown) => Option.Option<Decoded>) =>
  (type: string): Promise<readonly Option.Option<Decoded>[]> =>
    Effect.runPromise(
      Stack(APP_NAME, { providers: NO_PROVIDERS, state: inMemoryState() }, archive).pipe(
        Effect.provideService(Stage, "test"),
        Effect.scoped,
        Effect.map(({ resources }) =>
          pipe(
            Rec.values(resources),
            Arr.filter((resource) => isResourceOfType(resource, type)),
            Arr.map(({ Props }) => decode(Props)),
          ),
        ),
      ),
    );

const declared = declaredWith((props) => decodeProps(props));

test("ログのバケットは、管轄を指定せずに決まった名前で作り、日本にも同じ設定の組を作る", () =>
  expect(declared(R2.Bucket.Type)).resolves.toStrictEqual([
    Option.some({ name: BUCKET_NAME }),
    Option.some({ name: `${BUCKET_NAME}-japan` }),
  ]));

test("バケットの移し替えはアカウント内の全バケットの中身を扱い、ログの書き込みは日本のバケットだけを扱う", () =>
  expect(declared(ApiToken.AccountApiToken.Type)).resolves.toStrictEqual([
    Option.some({
      name: `${APP_NAME}-bucket-mover`,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers R2 Storage Bucket Item Read",
            "Workers R2 Storage Bucket Item Write",
          ],
          resources: { [`com.cloudflare.api.account.${ACCOUNT_ID}`]: "*" },
        },
      ],
    }),
    Option.some({
      name: `${APP_NAME}-worker-logs-writer`,
      policies: [
        {
          effect: "allow",
          permissionGroups: ["Workers R2 Storage Bucket Item Write"],
          resources: {
            [`com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_${JAPAN_BUCKET_NAME}`]: "*",
          },
        },
      ],
    }),
  ]));

test("ログのバケットは、古いログと途中で止まったマルチパートアップロードを消す", () =>
  expect(declaredWith(decodeLifecycle)(R2.Bucket.Type)).resolves.toStrictEqual([
    Option.some({ lifecycleRules: [{ id: "expire" }, { id: "abort-multipart" }] }),
    Option.some({ lifecycleRules: [{ id: "expire" }, { id: "abort-multipart" }] }),
  ]));
