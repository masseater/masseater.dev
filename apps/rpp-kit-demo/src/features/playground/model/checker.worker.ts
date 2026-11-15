import { expose } from "comlink";
import {
  Array as Arr,
  Boolean as Bool,
  Deferred,
  Effect,
  ManagedRuntime,
  Record as Rec,
  pipe,
} from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { createChecker } from "./checker";
import type { At, Checker, Completion, Hover, Lint, Source } from "./checker";

const SONG_TYPES = import.meta.glob<string>("/node_modules/rpp-kit/src/types.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const ready = Deferred.makeUnsafe<Checker>();

const files = (): readonly (readonly [string, string])[] =>
  pipe(
    Rec.values(SONG_TYPES),
    Arr.map((text) => ["/node_modules/rpp-kit/index.d.ts", text] as const),
  );

const gunzip = (bytes: ArrayBuffer): Effect.Effect<ArrayBuffer> =>
  Effect.promise(() =>
    new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer(),
  );

const wasmBytes = (url: string): Effect.Effect<ArrayBuffer, never, HttpClient.HttpClient> =>
  HttpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.flatMap((bytes) =>
      Bool.match(import.meta.env.PROD, {
        onTrue: () => gunzip(bytes),
        onFalse: () => Effect.succeed(bytes),
      }),
    ),
    Effect.orDie,
    Effect.withSpan("checker.wasm", { attributes: { url } }),
  );

const load = (url: string): Effect.Effect<Checker, never, HttpClient.HttpClient> =>
  wasmBytes(url).pipe(Effect.flatMap((wasm) => createChecker({ wasm, files: files() })));

const using = <Value>(use: (checker: Checker) => Value): Promise<Value> =>
  Effect.runPromise(Deferred.await(ready).pipe(Effect.map(use)));

const checker = {
  initialize: (wasmUrl: string): Promise<void> =>
    runtime.runPromise(Deferred.complete(ready, load(wasmUrl)).pipe(Effect.asVoid)),
  updateFile: (source: Source): Promise<void> =>
    using((current) => {
      current.updateFile(source);
    }),
  lint: (source: Source): Promise<readonly Lint[]> => using((current) => current.lint(source)),
  complete: (at: At): Promise<Completion> => using((current) => current.complete(at)),
  hover: (at: At): Promise<readonly Hover[]> => using((current) => current.hover(at)),
  transpile: (code: string): Promise<string> => using((current) => current.transpile(code)),
};

type CheckerWorker = typeof checker;

expose(checker);

export type { CheckerWorker };
