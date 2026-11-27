import type { Effect as SongEffect, Song } from "@r_masseater/song-format";
import { Array as Arr, Option, pipe } from "effect";

interface Chain {
  readonly fx: readonly SongEffect[];
}

const impulsesOf = (effect: SongEffect): readonly string[] => {
  if (effect.kind !== "reverb") {
    return [];
  }
  return [effect.left, ...Option.toArray(effect.right)];
};

const zonesOf = (instrument: Song["instruments"][number]): readonly string[] => {
  if (instrument.source.kind !== "samples") {
    return [];
  }
  return pipe(
    instrument.source.zones,
    Arr.map((zone) => zone.path),
  );
};

const fxOf = (chain: Chain): readonly SongEffect[] => chain.fx;

const effectsOf = (song: Song): readonly SongEffect[] => [
  ...song.master,
  ...pipe(song.tracks, Arr.flatMap(fxOf)),
  ...pipe(song.buses, Arr.flatMap(fxOf)),
];

const kitFilesOf = (song: Song): readonly string[] =>
  pipe(
    song.kits,
    Arr.flatMap((kit) => kit.voices),
    Arr.map((voice) => voice.path),
    Arr.filter((path) => path !== ""),
  );

export const sampleFilesOf = (song: Song): readonly string[] =>
  Arr.dedupe([
    ...pipe(
      song.samples,
      Arr.map((sample) => sample.path),
    ),
    ...kitFilesOf(song),
    ...pipe(song.instruments, Arr.flatMap(zonesOf)),
    ...pipe(effectsOf(song), Arr.flatMap(impulsesOf)),
  ]);
