import { useAtomValue } from "@effect/atom-react";
import { Effect, Option, Schedule, Stream, pipe } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { openedAtom } from "#src/entities/media/index.ts";
import { mountPlayer } from "#src/features/play-media/lib/mount.ts";
import { STILL } from "#src/shared/lib/player.ts";
import type { Player, Position } from "#src/shared/lib/player.ts";

const TICK = "200 millis";

/** @internal */
export const stageAtom = Atom.make(Option.none<HTMLElement>());

/** @internal */
export const playerAtom = Atom.make(
  Effect.fnUntraced(function* player(get) {
    const stage = yield* Effect.fromOption(get(stageAtom));
    const opened = yield* Effect.fromOption(get(openedAtom));
    return yield* mountPlayer({ stage, opened });
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
