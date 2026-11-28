import type { VideoScript } from "@masseater.dev/video-kit/script";
import {
  narrationKey,
  partsOf,
  relativeBeatsOf,
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

interface Take {
  readonly seconds: number;
  readonly lead?: number;
}

interface Recorded extends Take {
  readonly key: string;
  readonly made: boolean;
}

/** @internal */
export interface Narrated {
  readonly made: number;
  readonly kept: number;
}

interface SpokenLine {
  readonly voice: number;
  readonly spoken: string;
  readonly speed: number;
  readonly parts: readonly string[];
  readonly beats: readonly number[];
}

interface LineRequest extends SpokenLine {
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
  parts,
  beats,
  file,
}: SpokenLine & Readonly<{ file: string }>): Effect.Effect<Take, Failure, Services> =>
  Effect.gen(function* synthesizeFile() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const { wav, lead } = yield* synthesize({ style: voice, text: spoken, speed, parts, beats });
    const seconds = wavSeconds(wav);
    if (Option.isNone(seconds)) {
      return yield* videoError(`「${spoken}」の WAV にデータがない`);
    }
    yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
    yield* fileSystem.writeFile(file, wav);
    return { seconds: seconds.value, lead };
  });

const recordLine = ({
  manifest,
  ...line
}: LineRequest): Effect.Effect<Recorded, Failure, Services> =>
  Effect.gen(function* record() {
    const fileSystem = yield* FileSystem.FileSystem;
    const { voice, spoken, speed, beats } = line;
    const key = yield* narrationKey({ speaker: voice, spoken, speed, beats });
    const file = yield* fileOf(key);
    const known = Rec.get(manifest.narration, key);
    const exists = yield* fileSystem.exists(file);
    if (Option.isSome(known) && exists) {
      return { key, ...known.value, made: false };
    }
    const take = yield* synthesizeTo({ ...line, file });
    return { key, ...take, made: true };
  });

const spokenLines = (script: VideoScript): readonly SpokenLine[] =>
  pipe(
    script.cuts,
    Arr.flatMap((cut) =>
      pipe(
        cut.say,
        Arr.map((say, index) => ({
          voice: voiceOf(script)(cut),
          speed: speedOf(cut)(index),
          spoken: spokenOf({ say, readings: script.readings }),
          parts: pipe(
            partsOf(say),
            Arr.map((part) => spokenOf({ say: part, readings: script.readings })),
          ),
          beats: relativeBeatsOf(cut)(index),
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
      (line) => recordLine({ ...line, manifest }),
      { concurrency: 1 },
    );
    const fresh = pipe(
      recorded,
      Arr.map(({ key, made: _made, ...take }) => [key, take] as const),
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
