import { Effect, FileSystem, Path } from "effect";

import { betterleaksFile, gunzipped, sourcesOf } from "./archive.ts";
import { rulesCrateDirectory } from "./crate.ts";
import { ExtractFailed } from "./errors.ts";

const SOURCES = ["generated", "upstream-sources.json.gz"];
const PRESET = "/config/betterleaks.toml";
const LICENSE = "/LICENSE";

export interface ExtractTarget {
  readonly manifest: string;
  readonly output: string;
}

const failedWith = (cause: { readonly message: string }): ExtractFailed =>
  ExtractFailed.make({ message: cause.message });

/** @internal */
export const extractPresets = Effect.fn("h56m-presets.extract")(function* extractPresets({
  manifest,
  output,
}: ExtractTarget) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const crate = yield* rulesCrateDirectory(manifest);
  const archive = yield* fileSystem
    .readFile(path.join(crate, ...SOURCES))
    .pipe(Effect.mapError(failedWith));
  const sources = yield* gunzipped(archive).pipe(Effect.flatMap(sourcesOf));
  const preset = yield* betterleaksFile(PRESET)(sources);
  const license = yield* betterleaksFile(LICENSE)(sources);
  yield* fileSystem
    .makeDirectory(path.join(output, "presets"), { recursive: true })
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(path.join(output, "presets", "betterleaks.toml"), preset.text)
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(
      path.join(output, "THIRD-PARTY-NOTICES.txt"),
      `Betterleaks (MIT)\n${license.url}\n\n${license.text}`,
    )
    .pipe(Effect.mapError(failedWith));
});
