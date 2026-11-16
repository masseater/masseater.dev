import { Effect, Fiber, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import type { Song } from "#/widgets/daw-view/model/contract.ts";
import { firstLayout } from "#/widgets/daw-view/model/layout.ts";

import { rebuildChrome, unmix, wire } from "./controls.ts";
import { produce } from "./produce.ts";
import { shellOf } from "./shell.ts";
import type { Shell } from "./shell.ts";
import { painterOf } from "./stage.ts";

const SCOPE = "daw-song";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetched = Effect.fn("song.fetched")(function* fetched(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* Effect.flatMap(client.get(url), HttpClientResponse.filterStatusOk);
  return yield* response.arrayBuffer;
});

export const mountSong =
  (root: HTMLElement) =>
  (song: Song): (() => void) => {
    const aborted = new AbortController();
    root.classList.add(SCOPE);
    const shell: Shell = shellOf(root)({
      song,
      signal: aborted.signal,
      onLost: () => {
        unmix(shell);
      },
    });
    wire(shell);
    firstLayout(shell);
    rebuildChrome(shell);
    shell.loop.start(painterOf(shell));
    const production = runtime.runFork(produce({ shell, song, fetched }));
    return () => {
      aborted.abort();
      shell.loop.stop();
      shell.transport.close();
      runtime.runFork(Fiber.interrupt(production));
      root.replaceChildren();
      root.classList.remove(SCOPE);
    };
  };
