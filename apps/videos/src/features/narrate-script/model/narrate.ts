import type { VideoScript } from "@masseater.dev/video-kit/script";
import {
  narrationKey,
  speedOf,
  spokenOf,
  voiceOf,
  voicesOf,
} from "@masseater.dev/video-kit/script";
import { Array as Arr, Effect, FileSystem, Option, Path, Record as Rec, pipe } from "effect";
import type { Config, PlatformError } from "effect";
import type { HttpClient } from "effect/http";

import { narrationPath, tachiePath } from "#/shared/config/index.ts";
import type { Manifest } from "#/shared/lib/manifest-schema.ts";
import { readManifest, writeManifest } from "#/shared/lib/manifest.ts";
import { projectPaths, readScript } from "#/shared/lib/project.ts";
import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import { speakerName, speakerPortraits, synthesize } from "./voicevox.ts";
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
  readonly speed: number;
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
  speed,
  file,
}: Readonly<{ voice: number; spoken: string; speed: number; file: string }>): Effect.Effect<
  number,
  Failure,
  Services
> =>
  Effect.gen(function* synthesizeFile() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const wav = yield* synthesize({ style: voice, text: spoken, speed });
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
  speed,
  manifest,
}: LineRequest): Effect.Effect<Recorded, Failure, Services> =>
  Effect.gen(function* record() {
    const fileSystem = yield* FileSystem.FileSystem;
    const key = yield* narrationKey({ speaker: voice, spoken, speed });
    const file = yield* fileOf(key);
    const known = Rec.get(manifest.narration, key);
    const exists = yield* fileSystem.exists(file);
    if (Option.isSome(known) && exists) {
      return { key, seconds: known.value.seconds, made: false };
    }
    const seconds = yield* synthesizeTo({ voice, spoken, speed, file });
    return { key, seconds, made: true };
  });

interface SpokenLine {
  readonly voice: number;
  readonly spoken: string;
  readonly speed: number;
}

const spokenLines = (script: VideoScript): readonly SpokenLine[] =>
  pipe(
    script.cuts,
    Arr.flatMap((cut) =>
      pipe(
        cut.say,
        Arr.map((say) => ({
          voice: voiceOf(script)(cut),
          speed: speedOf(cut),
          spoken: spokenOf({ say, readings: script.readings }),
        })),
      ),
    ),
  );

type TachieRecord = NonNullable<Manifest["tachie"]>;

const savePortraits = (voice: number): Effect.Effect<TachieRecord, Failure, Services> =>
  Effect.gen(function* save() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const portraits = yield* speakerPortraits(voice);
    const saved = yield* Effect.forEach(
      portraits,
      ({ style, png }) =>
        Effect.gen(function* saveOne() {
          const relative = tachiePath(`voicevox-${String(style)}`);
          const file = path.join(paths.public, relative);
          yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
          yield* fileSystem.writeFile(file, png);
          return [String(style), { closed: relative }] as const;
        }),
      { concurrency: 1 },
    );
    return Rec.fromEntries(saved);
  });

const NO_TACHIE: TachieRecord = {};

const tachieIn = (manifest: Manifest): TachieRecord =>
  Option.getOrElse(Option.fromNullishOr(manifest.tachie), () => NO_TACHIE);

const namesOf = (
  voices: readonly number[],
): Effect.Effect<Readonly<Record<string, string>>, Failure, Services> =>
  Effect.forEach(
    voices,
    (voice) => speakerName(voice).pipe(Effect.map((name) => [String(voice), name] as const)),
    { concurrency: 1 },
  ).pipe(Effect.map((entries) => Rec.fromEntries(entries)));

const portraitsOf = (voices: readonly number[]): Effect.Effect<TachieRecord, Failure, Services> =>
  Effect.forEach(voices, savePortraits, { concurrency: 1 }).pipe(
    Effect.map((records) => pipe(records, Arr.flatMap(Rec.toEntries), Rec.fromEntries)),
  );

const narrateAll = (script: VideoScript): Effect.Effect<Narrated, Failure, Services> =>
  Effect.gen(function* narrateVoices() {
    const manifest = yield* readManifest;
    const voices = voicesOf(script);
    const names = yield* namesOf(voices);
    const portraits = yield* portraitsOf(voices);
    const recorded = yield* Effect.forEach(
      spokenLines(script),
      ({ voice, spoken, speed }) => recordLine({ voice, spoken, speed, manifest }),
      { concurrency: 1 },
    );
    const fresh = pipe(
      recorded,
      Arr.map(({ key, seconds }) => [key, { seconds }] as const),
      Rec.fromEntries,
    );
    yield* writeManifest({
      narration: { ...manifest.narration, ...fresh },
      speakers: { ...manifest.speakers, ...names },
      tachie: { ...portraits, ...tachieIn(manifest) },
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
    return yield* narrateAll(script);
  });
