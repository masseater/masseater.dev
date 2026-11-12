import { NodeServices } from "@effect/platform-node";
import { Changes, Pushed } from "@masseater.dev/yohaku-protocol/sync";
import type { StoredDocument, SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import {
  Array,
  Context,
  Effect,
  FileSystem,
  Layer,
  Match,
  Option,
  Ref,
  Schema,
  pipe,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { databaseLayer } from "#shared/database";
import { Settings } from "#shared/settings";

type Stored = typeof StoredDocument.Type;

const NO_REVISION = 0;
const NEXT = 1;
const ANY_PORT = 0;

class Remote extends Context.Service<Remote, Ref.Ref<readonly Stored[]>>()(
  "yohaku-server/features/sync/model/remote.test.support/Remote",
) {}

const encodeChanges = Schema.encodeEffect(Schema.fromJsonString(Changes));
const decodePushed = Schema.decodeEffect(Schema.fromJsonString(Pushed));

const sameDocument =
  (document: typeof SyncDocument.Type) =>
  ({ kind, id }: Stored): boolean =>
    kind === document.kind && id === document.id;

const latestRevision = (stored: readonly Stored[]): number =>
  pipe(
    stored,
    Array.last,
    Option.map(({ revision }) => revision),
    Option.getOrElse(() => NO_REVISION),
  );

const accepted = (
  stored: readonly Stored[],
  document: typeof SyncDocument.Type,
): readonly Stored[] => {
  const current = pipe(stored, Array.findFirst(sameDocument(document)));
  if (Option.exists(current, ({ updatedAt }) => updatedAt >= document.updatedAt)) {
    return stored;
  }
  const others = pipe(
    stored,
    Array.filter((entry) => !sameDocument(document)(entry)),
  );
  return [...others, { ...document, revision: latestRevision(stored) + NEXT }];
};

const changesAfter = (
  remote: Ref.Ref<readonly Stored[]>,
  after: number,
): Effect.Effect<string, Schema.SchemaError> =>
  Ref.get(remote).pipe(
    Effect.map(Array.filter(({ revision }) => revision > after)),
    Effect.flatMap((documents) => encodeChanges({ documents, more: false })),
  );

const pushed = (
  remote: Ref.Ref<readonly Stored[]>,
  body: string,
): Effect.Effect<string, Schema.SchemaError> =>
  decodePushed(body).pipe(
    Effect.flatMap(({ documents }) =>
      Effect.forEach(
        documents,
        (document) => Ref.update(remote, (stored) => accepted(stored, document)),
        { discard: true },
      ),
    ),
    Effect.as("{}"),
  );

const replyText = (
  remote: Ref.Ref<readonly Stored[]>,
  request: Readonly<{ method: string; after: string; body: string }>,
): Effect.Effect<string, Schema.SchemaError> => {
  if (request.method === "GET") {
    return changesAfter(remote, globalThis.Number(request.after));
  }
  return pushed(remote, request.body);
};

const fakeClient = (remote: Ref.Ref<readonly Stored[]>): HttpClient.HttpClient =>
  HttpClient.make((request, url) => {
    const text = Match.value(request.body).pipe(
      Match.tag("Uint8Array", (bytes) => new TextDecoder().decode(bytes.body)),
      Match.orElse(() => ""),
    );
    const after = pipe(
      Option.fromNullishOr(url.searchParams.get("after")),
      Option.getOrElse(() => "0"),
    );
    return replyText(remote, { method: request.method, after, body: text }).pipe(
      Effect.map((json) => HttpClientResponse.fromWeb(request, new Response(json))),
      Effect.orDie,
    );
  });

const settingsLayer = Layer.effect(
  Settings,
  Effect.gen(function* settings() {
    const fs = yield* FileSystem.FileSystem;
    const dataDirectory = yield* fs.makeTempDirectoryScoped();
    return { dataDirectory, mcpPort: ANY_PORT };
  }),
);

const remoteLayer = Layer.effect(Remote, Ref.make<readonly Stored[]>([]));

const httpLayer = Layer.effect(HttpClient.HttpClient, Remote.pipe(Effect.map(fakeClient)));

/** @internal */
const syncTestLayer = Layer.mergeAll(databaseLayer, httpLayer).pipe(
  Layer.provideMerge(remoteLayer),
  Layer.provideMerge(settingsLayer),
  Layer.provideMerge(NodeServices.layer),
);

/** @internal */
export { Remote, syncTestLayer };
