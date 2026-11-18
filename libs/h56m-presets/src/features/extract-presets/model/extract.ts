import { Effect, FileSystem, Path } from "effect";

import { ExtractFailed } from "./errors.ts";

const PRESET = ["config", "betterleaks.toml"];
const LICENSE = "LICENSE";

export interface ExtractTarget {
  readonly source: string;
  readonly revision: string;
  readonly output: string;
}

const failedWith = (cause: { readonly message: string }): ExtractFailed =>
  ExtractFailed.make({ message: cause.message });

/** @internal */
export const extractPresets = Effect.fn("h56m-presets.extract")(function* extractPresets({
  source,
  revision,
  output,
}: ExtractTarget) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const preset = yield* fileSystem
    .readFileString(path.join(source, ...PRESET))
    .pipe(Effect.mapError(failedWith));
  const license = yield* fileSystem
    .readFileString(path.join(source, LICENSE))
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .makeDirectory(path.join(output, "presets"), { recursive: true })
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(path.join(output, "presets", "betterleaks.toml"), preset)
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(
      path.join(output, "THIRD-PARTY-NOTICES.txt"),
      `Betterleaks (MIT)\nhttps://github.com/betterleaks/betterleaks/blob/${revision}/LICENSE\n\n${license}`,
    )
    .pipe(Effect.mapError(failedWith));
});
