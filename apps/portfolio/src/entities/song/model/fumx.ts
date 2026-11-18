import type { Song as DawSong } from "@masseater.dev/daw-view";
import { recordingOf, sampleFilesOf } from "@masseater.dev/fumx-studio";
import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import type { Song } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { browserRuntime } from "#/shared/lib/index.ts";

import { factsOf } from "./song.ts";
import type { Work } from "./song.ts";

const worklets = import.meta.glob<string>("./fumx-worklet.ts", {
  query: "?worker&url",
  import: "default",
  eager: true,
});

const worklet = pipe(Rec.values(worklets), Arr.join(""));

const sampleUrls = import.meta.glob<string>("../catalog/*/samples/*.flac", {
  query: "?url",
  import: "default",
  eager: true,
});

const samplesOf =
  (slug: string) =>
  (song: Song): Readonly<Record<string, string>> =>
    pipe(
      sampleFilesOf(song),
      Arr.flatMap((file) =>
        pipe(
          Rec.get(sampleUrls, `../catalog/${slug}/${file}`),
          Option.map((url) => [file, url] as const),
          Option.toArray,
        ),
      ),
      Rec.fromEntries,
    );

export interface Listing {
  readonly slug: string;
  readonly work: Work;
}

export const dawSongOfFumx =
  ({ slug, work }: Listing) =>
  (song: Song): DawSong => {
    const recording = recordingOf(song)(worklet);
    return {
      title: song.title,
      facts: factsOf(work),
      ...recording.structure,
      credits: work.credits,
      samples: samplesOf(slug)(song),
      sampleRate: SAMPLE_RATE,
      render: ({ signal, ...session }) =>
        browserRuntime.runPromise(Effect.scoped(recording.render(session)), { signal }),
    };
  };
