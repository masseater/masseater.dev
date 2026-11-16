import { ApiToken, CloudflareEnvironment, Providers, R2 } from "@alchemy.run/cloudflare";
import { Stack, isResourceOfType } from "alchemy";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { Array as Arr, Effect, Layer, Option, Record as Rec, Redacted, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { logArchive } from "./log-archive.ts";

const APP_NAME = "example";
const ACCOUNT_ID = "0123456789abcdef0123456789abcdef";
const BUCKET_NAME = `${APP_NAME}-worker-logs`;

const Declared = Schema.Struct({
  name: Schema.String,
  jurisdiction: Schema.optional(Schema.String),
  policies: Schema.optional(Schema.Unknown),
});

const decodeProps = Schema.decodeUnknownOption(Declared);

const UNUSED_TOKEN = Redacted.make("unused");

const ENVIRONMENT = Effect.succeed({
  type: "apiToken" as const,
  apiToken: UNUSED_TOKEN,
  accountId: ACCOUNT_ID,
  source: { type: "env" as const },
});

const archive = logArchive(APP_NAME).pipe(
  Effect.provideService(CloudflareEnvironment, ENVIRONMENT),
);

const REGISTERED: Readonly<Record<string, never>> = {};

const NO_PROVIDERS = Layer.succeed(Providers, {
  kind: "ProviderCollection",
  get: (service: string) => REGISTERED[service],
  providers: REGISTERED,
});

const declared = (type: string): Promise<readonly Option.Option<typeof Declared.Type>[]> =>
  Effect.runPromise(
    Stack(APP_NAME, { providers: NO_PROVIDERS, state: inMemoryState() }, archive).pipe(
      Effect.provideService(Stage, "test"),
      Effect.scoped,
      Effect.map(({ resources }) =>
        pipe(
          Rec.values(resources),
          Arr.filter((resource) => isResourceOfType(resource, type)),
          Arr.map(({ Props }) => decodeProps(Props)),
        ),
      ),
    ),
  );

test("ログのバケットは、管轄を指定せずに決まった名前で作る", () =>
  expect(declared(R2.Bucket.Type)).resolves.toStrictEqual([Option.some({ name: BUCKET_NAME })]));

test("ログを書くトークンは、ログのバケットの中身を書く権限だけを持つ", () =>
  expect(declared(ApiToken.AccountApiToken.Type)).resolves.toStrictEqual([
    Option.some({
      name: `${APP_NAME}-worker-logs-writer`,
      policies: [
        {
          effect: "allow",
          permissionGroups: ["Workers R2 Storage Bucket Item Write"],
          resources: {
            [`com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_${BUCKET_NAME}`]: "*",
          },
        },
      ],
    }),
  ]));
