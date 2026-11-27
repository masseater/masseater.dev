import type { VideoScript } from "@masseater.dev/video-kit/script";
import { narrationKey, spokenOf } from "@masseater.dev/video-kit/script";
import { Array as Arr, Effect, FileSystem, Option, Path, Record as Rec, pipe } from "effect";
import type { Config, PlatformError } from "effect";
import type { HttpClient } from "effect/http";

import { narrationPath, tachiePath } from "#/shared/config/index.ts";
import type { Manifest } from "#/shared/lib/manifest-schema.ts";
import { readManifest, writeManifest } from "#/shared/lib/manifest.ts";
import { projectPaths, readScript } from "#/shared/lib/project.ts";
import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import { speakerName, speakerPortrait, synthesize } from "./voicevox.ts";
import { wavSeconds } from "./wav.ts";

/** @internal */
export type Services = FileSystem.FileSystem | Path.Path | HttpClient.HttpClient;
/** @internal */
export type Failure = VideoError | PlatformError.PlatformError | Config.ConfigError;

interface Recorded {
  readonly key: string;
  readonly seconds: number;
  readonly made: boolean;
}

/** @internal */
export interface Narrated {
  readonly made: number;
  readonly kept: number;
}

interface LineRequest {
  readonly voice: number;
  readonly spoken: string;
  readonly manifest: Manifest;
}

const fileOf = (key: string): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* file() {
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    return path.join(paths.public, narrationPath(key));
  });

const synthesizeTo = ({
  voice,
  spoken,
  file,
}: Readonly<{ voice: number; spoken: string; file: string }>): Effect.Effect<
  number,
  Failure,
  Services
> =>
  Effect.gen(function* synthesizeFile() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const wav = yield* synthesize({ style: voice, text: spoken });
    const seconds = wavSeconds(wav);
    if (Option.isNone(seconds)) {
      return yield* videoError(`「${spoken}」の WAV にデータがない`);
    }
    yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
    yield* fileSystem.writeFile(file, wav);
    return seconds.value;
  });

const recordLine = ({
  voice,
  spoken,
  manifest,
}: LineRequest): Effect.Effect<Recorded, Failure, Services> =>
  Effect.gen(function* record() {
    const fileSystem = yield* FileSystem.FileSystem;
    const key = yield* narrationKey({ speaker: voice, spoken });
    const file = yield* fileOf(key);
    const known = Rec.get(manifest.narration, key);
    const exists = yield* fileSystem.exists(file);
    if (Option.isSome(known) && exists) {
      return { key, seconds: known.value.seconds, made: false };
    }
    const seconds = yield* synthesizeTo({ voice, spoken, file });
    return { key, seconds, made: true };
  });

const spokenLines = (script: VideoScript): readonly string[] =>
  pipe(
    script.cuts,
    Arr.flatMap(({ say }) => say),
    Arr.map((say) => spokenOf({ say, readings: script.readings })),
  );

const savePortrait = (voice: number): Effect.Effect<string, Failure, Services> =>
  Effect.gen(function* save() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const relative = tachiePath(`voicevox-${String(voice)}`);
    const file = path.join(paths.public, relative);
    if (!(yield* fileSystem.exists(file))) {
      const png = yield* speakerPortrait(voice);
      yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
      yield* fileSystem.writeFile(file, png);
    }
    return relative;
  });

const NO_TACHIE: NonNullable<Manifest["tachie"]> = {};

const tachieIn = (manifest: Manifest): NonNullable<Manifest["tachie"]> =>
  Option.getOrElse(Option.fromNullishOr(manifest.tachie), () => NO_TACHIE);

const narrateWith = (
  script: VideoScript,
  voice: number,
): Effect.Effect<Narrated, Failure, Services> =>
  Effect.gen(function* narrateVoice() {
    const manifest = yield* readManifest;
    const name = yield* speakerName(voice);
    const portrait = yield* savePortrait(voice);
    const recorded = yield* Effect.forEach(
      spokenLines(script),
      (spoken) => recordLine({ voice, spoken, manifest }),
      {
        concurrency: 1,
      },
    );
    const fresh = pipe(
      recorded,
      Arr.map(({ key, seconds }) => [key, { seconds }] as const),
      Rec.fromEntries,
    );
    yield* writeManifest({
      narration: { ...manifest.narration, ...fresh },
      speakers: { ...manifest.speakers, [String(voice)]: name },
      tachie: { [String(voice)]: { closed: portrait }, ...tachieIn(manifest) },
    });
    const made = pipe(
      recorded,
      Arr.filter((entry) => entry.made),
    ).length;
    return { made, kept: recorded.length - made };
  });

/** @internal */
export const narrate = (slug: string): Effect.Effect<Narrated, Failure, Services> =>
  Effect.gen(function* narrateVideo() {
    const script = yield* readScript(slug);
    return yield* narrateWith(script, script.voice);
  });
