import { Array as Arr, Match, Option, pipe } from "effect";

import type { Song } from "#/entities/song/song.ts";
import type { TrackSource, VoiceLine } from "#generated/langium/ast.ts";

import type { LineKind } from "./items.ts";
import type { From } from "./problem.ts";

export interface Voice {
  readonly track: string;
  readonly kind: LineKind;
}

const voicesOf =
  (kits: Song["kits"]) =>
  (name: string): readonly string[] =>
    pipe(
      kits,
      Arr.findFirst((kit) => kit.name === name),
      Option.match({
        onNone: () => [],
        onSome: (kit) =>
          pipe(
            kit.voices,
            Arr.map((voice) => voice.name),
          ),
      }),
    );

const sourceKindOf =
  (kits: Song["kits"]): From<TrackSource, LineKind> =>
  (source) =>
    Match.value(source).pipe(
      Match.discriminatorsExhaustive("$type")({
        KitSource: (kit): LineKind => ({
          kind: "kit",
          kit: kit.kit.$refText,
          voices: voicesOf(kits)(kit.kit.$refText),
        }),
        InstrumentRef: (): LineKind => ({ kind: "instrument" }),
        AudioSource: (): LineKind => ({ kind: "audio" }),
      }),
    );

export const voiceOf =
  (kits: Song["kits"]): From<VoiceLine, Option.Option<Voice>> =>
  (line) => {
    if (line.master) {
      return Option.some({ track: "master", kind: { kind: "master" } });
    }
    return pipe(
      Option.fromNullishOr(line.track),
      Option.flatMap((reference) => Option.fromNullishOr(reference.ref)),
      Option.map((track) => ({ track: track.name, kind: sourceKindOf(kits)(track.source) })),
    );
  };
