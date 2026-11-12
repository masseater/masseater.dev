import {
  ENDPOINT_FILE,
  ServerUrl,
  YohakuClient,
  awaitEndpoint,
  yohakuClientLayer,
} from "@masseater.dev/yohaku-protocol";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import type { Yohaku } from "./yohaku.ts";

const UNREACHABLE = "余白のサーバーに接続できません";

const unreachable = (): Error => new Error(UNREACHABLE);

const endpointText = Effect.gen(function* endpointText() {
  const http = yield* HttpClient.HttpClient;
  const directory = yield* Effect.tryPromise({ try: appLocalDataDir, catch: unreachable });
  const file = yield* Effect.tryPromise({
    try: () => join(directory, ENDPOINT_FILE),
    catch: unreachable,
  });
  const response = yield* HttpClient.filterStatusOk(http).get(convertFileSrc(file));
  return yield* response.text;
}).pipe(Effect.provideService(FetchHttpClient.RequestInit, { cache: "no-store" }));

const serverUrlLayer = Layer.effect(
  ServerUrl,
  Effect.gen(function* serverUrl() {
    const context = yield* Effect.context<HttpClient.HttpClient>();
    return { url: awaitEndpoint(Effect.provideContext(endpointText, context)) };
  }),
);

const runtime = ManagedRuntime.make(
  yohakuClientLayer.pipe(Layer.provide(serverUrlLayer), Layer.provide(FetchHttpClient.layer)),
);

type Client = typeof YohakuClient.Service;

const call = <Value>(
  request: (client: Client) => Effect.Effect<Value, unknown>,
): Promise<Value> => runtime.runPromise(YohakuClient.pipe(Effect.flatMap(request)));

async function* streamed(
  request: (client: Client) => Stream.Stream<string, unknown>,
): AsyncGenerator<string> {
  const stream = Stream.unwrap(YohakuClient.pipe(Effect.map(request)));
  yield* await runtime.runPromise(Stream.toAsyncIterableEffect(stream));
}

const tauriYohaku: Yohaku = {
  listManuscripts: () =>
    call(({ ListManuscripts: list }) => list().pipe(Effect.map(({ manuscripts }) => manuscripts))),
  createManuscript: () => call(({ CreateManuscript: create }) => create()),
  openManuscript: (id) => call(({ OpenManuscript: open }) => open({ id })),
  saveParagraphs: (saving) => call(({ SaveParagraphs: save }) => save(saving)),
  setTitle: (titling) => call(({ SetTitle: set }) => set(titling)),
  getAnnotations: (id) => call(({ GetAnnotations: get }) => get({ id })),
  draftFromMemo: (target) => streamed(({ DraftFromMemo: draft }) => draft(target)),
  rewriteRemark: (target) => streamed(({ RewriteRemark: rewrite }) => rewrite(target)),
  dismissRemark: (target) => call(({ DismissRemark: dismiss }) => dismiss(target)),
  logReaction: (reaction) => call(({ LogReaction: log }) => log({ reaction })),
  listSources: () =>
    call(({ ListSources: list }) => list().pipe(Effect.map(({ sources }) => sources))),
  ingestText: (text) => call(({ IngestText: ingest }) => ingest({ text })),
  revertSource: (id) => call(({ RevertSource: revert }) => revert({ id })),
  getMcp: () => call(({ GetMcp: get }) => get()),
};

export { tauriYohaku };
