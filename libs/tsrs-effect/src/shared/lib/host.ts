import { Effect, Path, Schema } from "effect";

import { manifestIn } from "./manifest.ts";
import { executableOf, targetOf } from "./target.ts";

const BINARY = "tsrs";
const NATIVE = "native";

const taggedError = Schema.TaggedError;

class UnsupportedPlatform extends taggedError<
  UnsupportedPlatform,
  { readonly brand: unique symbol }
>()("UnsupportedPlatform", { message: Schema.String }) {}

export interface Host {
  readonly directory: string;
  readonly platform: string;
  readonly arch: string;
}

/** @internal */
export const buildOf = Effect.fn("buildOf")(function* buildOf({ directory, platform, arch }: Host) {
  const path = yield* Path.Path;
  const manifest = yield* manifestIn(directory);
  const target = yield* Effect.fromOption(targetOf(manifest.upstream.targets)(platform, arch)).pipe(
    Effect.mapError(() =>
      UnsupportedPlatform.make({ message: `no target for ${platform}-${arch}` }),
    ),
  );
  const output = path.join(directory, NATIVE, target);
  const executable = executableOf(BINARY)(platform);
  return {
    upstream: manifest.upstream,
    target,
    output,
    executable,
    binary: path.join(output, executable),
  };
});
