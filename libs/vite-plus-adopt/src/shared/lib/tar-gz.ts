import { Effect, Stream } from "effect";
import { Tar } from "effect/encoding";

import { attempt } from "./attempt.ts";
import { toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";

/** @internal */
export interface TarEntry {
  readonly header: Tar.Header;
  readonly bytes: Uint8Array;
}

const gunzipped = (data: Uint8Array): Effect.Effect<ArrayBuffer, VpToolsError> => {
  const compressed = new Blob([new Uint8Array(data)]).stream();
  return attempt("gunzip")(() =>
    new Response(compressed.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(),
  );
};

const untarred = (archive: ArrayBuffer): Effect.Effect<readonly TarEntry[], VpToolsError> =>
  Stream.make(new Uint8Array(archive)).pipe(
    Stream.pipeThroughChannel(Tar.decode()),
    Stream.mapEffect(({ header, body }) =>
      Effect.map(Stream.mkUint8Array(body), (bytes): TarEntry => ({ header, bytes })),
    ),
    Stream.runCollect,
    Effect.mapError(toolFailed("untar")),
  );

/** @internal */
export const readTarGz = (data: Uint8Array): Effect.Effect<readonly TarEntry[], VpToolsError> =>
  Effect.flatMap(gunzipped(data), untarred);
