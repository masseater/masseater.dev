import { Effect, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import type { Song } from "./contract.ts";
import { rebuildChrome, unmix, wire } from "./controls.ts";
import { firstLayout } from "./layout.ts";
import { produce } from "./produce.ts";
import { shellOf } from "./shell.ts";
import type { Shell } from "./shell.ts";
import { painterOf } from "./stage.ts";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetched = Effect.fn("song.fetched")(function* fetched(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* Effect.flatMap(client.get(url), HttpClientResponse.filterStatusOk);
  return yield* response.arrayBuffer;
});

export const mountSong =
  (root: HTMLElement) =>
  (song: Song): void => {
    const shell: Shell = shellOf(root)({
      song,
      onLost: () => {
        unmix(shell);
      },
    });
    wire(shell);
    firstLayout(shell);
    rebuildChrome(shell);
    shell.loop.start(painterOf(shell));
    runtime.runFork(produce({ shell, song, fetched }));
  };
