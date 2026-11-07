import { Array as Arr, Effect, Match, Record as Rec, String as Str, pipe } from "effect";
import type { Plugin, Rolldown } from "vite-plus";

const TSC_WASM = "@typescript/typescript-wasip1-wasm/lib/tsc.wasm";

const bytesOf = (source: string | Uint8Array): Uint8Array<ArrayBuffer> =>
  Match.value(source).pipe(
    Match.when(Match.string, (text) => new TextEncoder().encode(text)),
    Match.orElse((bytes) => Uint8Array.from(bytes)),
  );

const gzipped = (source: string | Uint8Array): Effect.Effect<Uint8Array<ArrayBuffer>> =>
  Effect.promise(() =>
    new Response(
      new Blob([bytesOf(source)]).stream().pipeThrough(new CompressionStream("gzip")),
    ).bytes(),
  );

const gzipTscWasm = (): Plugin => ({
  name: "gzip-tsc-wasm",
  apply: "build",
  applyToEnvironment: (environment) => environment.config.consumer === "client",
  generateBundle: (_options, bundle) =>
    Effect.runPromise(
      pipe(
        Rec.values(bundle),
        Arr.filter(
          (output): output is Rolldown.OutputAsset =>
            output.type === "asset" &&
            pipe(output.originalFileNames, Arr.some(Str.endsWith(TSC_WASM))),
        ),
        Effect.forEach((asset) =>
          gzipped(asset.source).pipe(
            Effect.flatMap((bytes) =>
              Effect.sync(() => {
                asset.source = bytes;
              }),
            ),
          ),
        ),
        Effect.asVoid,
      ),
    ),
});

export { gzipTscWasm };
