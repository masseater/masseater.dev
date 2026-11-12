import {
  CHANGES_PATH,
  Changes,
  DOCUMENTS_PATH,
  Pushed,
  SYNC_ORIGIN,
} from "@masseater.dev/yohaku-protocol/sync";
import type { SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import { Effect } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { syncFailed } from "./sync-failed.ts";

const encodePushed = HttpClientRequest.schemaBodyJson(Pushed);

const okClient = HttpClient.HttpClient.pipe(Effect.map(HttpClient.filterStatusOk));

/** @internal */
const fetchChanges = Effect.fn("fetchChanges")(function* fetchChanges(
  request: Readonly<{ accessToken: string; after: number }>,
) {
  const client = yield* okClient;
  const response = yield* client.execute(
    HttpClientRequest.get(`${SYNC_ORIGIN}${CHANGES_PATH}`, {
      urlParams: { after: request.after.toString() },
      acceptJson: true,
    }).pipe(HttpClientRequest.bearerToken(request.accessToken)),
  );
  return yield* HttpClientResponse.schemaBodyJson(Changes)(response);
}, Effect.mapError(syncFailed));

/** @internal */
const pushDocuments = Effect.fn("pushDocuments")(function* pushDocuments(
  request: Readonly<{ accessToken: string; documents: readonly (typeof SyncDocument.Type)[] }>,
) {
  const client = yield* okClient;
  const put = yield* HttpClientRequest.put(`${SYNC_ORIGIN}${DOCUMENTS_PATH}`).pipe(
    HttpClientRequest.bearerToken(request.accessToken),
    encodePushed({ documents: request.documents }),
  );
  yield* client.execute(put);
}, Effect.mapError(syncFailed));

export { fetchChanges, pushDocuments };
