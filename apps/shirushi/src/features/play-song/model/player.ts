import { useAtomValue } from "@effect/atom-react";
import { Effect, Option, Schedule, Stream, pipe } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { songAtom } from "#/entities/song";
import { mountPlayer } from "#/features/play-song/lib/mount";
import { STILL } from "#/shared/lib/player";
import type { Player, Position } from "#/shared/lib/player";

const TICK = "200 millis";

/** @internal */
export const stageAtom = Atom.make(Option.none<HTMLElement>());

/** @internal */
export const playerAtom = Atom.make(
  Effect.fnUntraced(function* player(get) {
    const stage = yield* Effect.fromOption(get(stageAtom));
    const song = yield* Effect.fromOption(get(songAtom));
    return yield* mountPlayer({ stage, source: song.source });
  }),
);

const positionAtom = Atom.make((get) =>
  pipe(
    get.result(playerAtom),
    Effect.map((player) =>
      Stream.fromEffectSchedule(
        Effect.sync(() => player.time()),
        Schedule.spaced(TICK),
      ),
    ),
    Stream.unwrap,
  ),
);

export const usePlayer = (): Option.Option<Player> => AsyncResult.value(useAtomValue(playerAtom));

export const usePosition = (): Position =>
  AsyncResult.getOrElse(useAtomValue(positionAtom), () => STILL);
