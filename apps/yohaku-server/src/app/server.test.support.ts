import {
  ENDPOINT_FILE,
  ServerUrl,
  YohakuClient,
  awaitEndpoint,
  yohakuClientLayer,
} from "@masseater.dev/yohaku-protocol";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Context, Effect, FileSystem, Layer, Path, Ref, String, pipe } from "effect";
import { SecureRandom } from "effect/crypto";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import type { Instruction } from "#shared/agent";
import { Settings } from "#shared/settings";

import { fakeAgent } from "./fake-agent.test.support.ts";
import { appLayer, platformLayer } from "./server-layer.ts";

const ANY_PORT = 0;
const REQUEST_ID = 1;
const CLASSIFYING = "番号つきの行";

class Calls extends Context.Service<Calls, Ref.Ref<readonly Instruction[]>>()(
  "yohaku-server/app/server.test.support/Calls",
) {}

const endpointText = Effect.gen(function* endpointText() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDirectory } = yield* Settings;
  return yield* fs.readFileString(path.join(dataDirectory, ENDPOINT_FILE));
});

const serverUrlLayer = Layer.effect(
  ServerUrl,
  Effect.gen(function* serverUrl() {
    const context = yield* Effect.context<FileSystem.FileSystem | Path.Path | Settings>();
    return { url: awaitEndpoint(Effect.provideContext(endpointText, context)) };
  }),
);

const callsLayer = Layer.effect(Calls, Ref.make<readonly Instruction[]>([]));

const settingsLayer = Layer.effect(
  Settings,
  Effect.gen(function* settings() {
    const fs = yield* FileSystem.FileSystem;
    const dataDirectory = yield* fs.makeTempDirectoryScoped();
    return { dataDirectory, mcpPort: ANY_PORT };
  }),
);

const agentFromCalls = Layer.unwrap(Calls.pipe(Effect.map(fakeAgent)));

/** @internal */
const testLayer = yohakuClientLayer.pipe(
  Layer.provide(serverUrlLayer),
  Layer.provideMerge(appLayer),
  Layer.provide(agentFromCalls),
  Layer.provideMerge(callsLayer),
  Layer.provideMerge(settingsLayer),
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(platformLayer),
);

/** @internal */
const written = Effect.fn("written")(function* written(texts: readonly string[]) {
  const { CreateManuscript: createManuscript, SaveParagraphs: saveParagraphs } =
    yield* YohakuClient;
  const random = yield* SecureRandom.SecureRandom;
  const manuscript = yield* createManuscript();
  const paragraphs: readonly (typeof Paragraph.Type)[] = yield* pipe(
    texts,
    Effect.forEach((text) => random.uuidV7().pipe(Effect.map((id) => ({ id, text })))),
  );
  yield* saveParagraphs({ id: manuscript.id, paragraphs });
  return { id: manuscript.id, paragraphs };
});

interface McpCall {
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly headers: Readonly<Record<string, string>>;
}

/** @internal */
const mcpCall = Effect.fn("mcpCall")(function* mcpCall({ name, args, headers }: McpCall) {
  const { GetMcp: getMcp } = yield* YohakuClient;
  const http = yield* HttpClient.HttpClient;
  const { url } = yield* getMcp();
  const request = yield* HttpClientRequest.post(url).pipe(
    HttpClientRequest.setHeaders({ accept: "application/json, text/event-stream", ...headers }),
    HttpClientRequest.bodyJson({
      jsonrpc: "2.0",
      id: REQUEST_ID,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  );
  const response = yield* http.execute(request);
  const text = yield* response.text;
  return { status: response.status, text };
});

/** @internal */
const bearer = Effect.gen(function* bearer() {
  const { GetMcp: getMcp } = yield* YohakuClient;
  const { token } = yield* getMcp();
  return { authorization: `Bearer ${token}` };
});

/** @internal */
const judgedKinds = Effect.gen(function* judgedKinds() {
  const calls = yield* Calls;
  const all = yield* Ref.get(calls);
  return pipe(
    all,
    Array.filter(({ system }) => String.includes(CLASSIFYING)(system)),
    Array.length,
  );
});

/** @internal */
const lastPrompt = Effect.gen(function* lastPrompt() {
  const calls = yield* Calls;
  const all = yield* Ref.get(calls);
  const last = yield* Effect.fromOption(Array.last(all));
  return last.prompt;
});

export { bearer, judgedKinds, lastPrompt, mcpCall, testLayer, written };
