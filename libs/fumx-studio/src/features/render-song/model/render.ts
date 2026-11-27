import type { Song } from "@r_masseater/song-format";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { clockOf } from "#/entities/clock/index.ts";
import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";
import { busOf } from "#/shared/lib/studio/bus.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";

import type { Context, Session } from "./context.ts";
import { mastered } from "./master.ts";
import type { Mastered } from "./master.ts";
import { pluggedMix } from "./plugged.ts";
import { busStem, trackStem } from "./stems.ts";
import { Unplayable } from "./unplayable.ts";

const TAIL_SECONDS = 2;
const UNPLAYED = ["slices", "edits", "automations", "ducks", "controls"] as const;

const declared = (items: readonly unknown[]): boolean => Arr.isReadonlyArrayNonEmpty(items);

const unplayedIn = (song: Song): Effect.Effect<void, Unplayable> =>
  pipe(
    UNPLAYED,
    Arr.findFirst((part) => declared(song[part])),
    Option.match({
      onNone: () => Effect.void,
      onSome: (part) => Effect.fail(Unplayable.make({ part })),
    }),
  );

export const contextOf =
  (song: Song) =>
  (session: Session): Context => {
    const clock = clockOf(song);
    const tail = Option.getOrElse(song.tailSeconds, () => TAIL_SECONDS);
    const frames = Math.ceil((clock.end + tail) * SAMPLE_RATE);
    const buses = new Map(
      pipe(
        song.buses,
        Arr.map((bus): readonly [string, Bus] => [bus.name, busOf(frames)({ name: bus.name })]),
      ),
    );
    return { song, session, clock, frames, buses, samples: session.samples };
  };

const reported =
  (context: Context) =>
  <Value>(
    index: number,
    name: string,
    run: Effect.Effect<Value, Unplayable>,
  ): Effect.Effect<Value, Unplayable> => {
    const total = context.song.tracks.length + context.song.buses.length;
    return Effect.andThen(
      Effect.sync(() => {
        context.session.progress(index / total, name);
      }),
      run,
    );
  };

const mixedDown = (context: Context): Effect.Effect<Mastered, Unplayable> =>
  Effect.gen(function* mixed() {
    const { song } = context;
    const report = reported(context);
    const heads = pipe(
      song.tracks,
      Arr.filter((track) => Option.isNone(track.into)),
    );
    const tracks = yield* Effect.forEach(
      heads,
      (track, index) => report(index, track.name, trackStem(context)(track)),
      { concurrency: 1 },
    );
    const buses = yield* Effect.forEach(
      song.buses,
      (bus, index) => report(tracks.length + index, bus.name, busStem(context)(bus)),
      { concurrency: 1 },
    );
    return yield* mastered({ song, frames: context.frames, stems: [...tracks, ...buses] });
  });

export const renderSong = Effect.fn("fumx.render")(function* renderSong(
  song: Song,
  session: Session,
) {
  yield* unplayedIn(song);
  const context = contextOf(song)(session);
  return yield* Option.match(song.mix, {
    onNone: () => mixedDown(context),
    onSome: pluggedMix(context),
  });
});
