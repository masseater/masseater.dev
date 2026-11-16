import type { Song as DawSong, RenderSession, Rendered, TrackStyle } from "@masseater.dev/daw-view";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import type { Scope } from "effect";

import type { Form } from "./program.ts";
import { factsOf } from "./song.ts";
import type { Work } from "./song.ts";

const EXTENSION = /\.flac$/u;

export type Look = Readonly<{
  hues: Readonly<Record<string, number>>;
  tones: Readonly<Record<string, TrackStyle["tone"]>>;
}>;

export type Recording = Readonly<{
  work: Work;
  form: Form;
  look: Look;
  sampleUrls: Readonly<Record<string, string>>;
  sampleRate: number;
  render: (session: Omit<RenderSession, "signal">) => Effect.Effect<Rendered, never, Scope.Scope>;
}>;

export const samplesIn = (
  found: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> =>
  pipe(
    Rec.toEntries(found),
    Arr.flatMap(([path, url]) =>
      pipe(
        Str.split(path, "/"),
        Arr.last,
        Option.map((file): readonly [string, string] => [Str.replace(EXTENSION, "")(file), url]),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );

export const workletIn = (found: Readonly<Record<string, string>>): string =>
  pipe(Rec.values(found), Arr.join(""));

export const dawSongOf = ({
  work,
  form,
  look,
  sampleUrls,
  sampleRate,
  render,
}: Recording): DawSong => ({
  title: work.title,
  facts: factsOf(work),
  tempo: form.BPM,
  swing: form.SWING,
  bars: form.BARS,
  tail: form.TAIL,
  sections: pipe(
    Rec.toEntries(form.SEC),
    Arr.map(([name, [from, to]]) => ({ name, from, to })),
  ),
  marks: pipe(
    form.MARKS,
    Arr.map(([bar, label]) => ({ bar, label })),
  ),
  tracks: pipe(
    Rec.toEntries(look.hues),
    Arr.map(([name, hue]) => ({
      name,
      hue,
      tone: Option.getOrElse(Rec.get(look.tones, name), () => "full" as const),
    })),
  ),
  credits: work.credits,
  samples: sampleUrls,
  sampleRate,
  render: ({ signal, ...session }) => Effect.runPromise(Effect.scoped(render(session)), { signal }),
});
