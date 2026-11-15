import { Effect, Schedule, pipe } from "effect";

import {
  phaseAtom,
  staleAtom,
  autosaving,
  release,
  reset,
  startListening,
} from "#/entities/interview";
import type { Phase } from "#/entities/interview";
import { due } from "#/features/ask-question";
import type { Due } from "#/features/ask-question";
import { read, write } from "#/shared/lib/registry";
import { runtime } from "#/shared/lib/runtime";
import { holdScreen } from "#/shared/lib/screen-hold";

import { actionsFor } from "./actions.ts";
import type { Actions } from "./actions.ts";

type Session = Pick<Actions, "typed" | "typing" | "wrapUp">;

const TICK = "250 millis";
const NO_NUDGE = 0;

const fadeIfStale = Effect.fn("kikite.fadeIfStale")(function* fadeIfStale(stale: boolean) {
  const shown = yield* read(staleAtom);
  if (shown !== stale) {
    yield* write(staleAtom, stale);
  }
});

const trigger = (actions: Actions, now: Due): void => {
  if (now.ask) {
    actions.ask();
  }
  if (now.summarize) {
    actions.summarize();
  }
  if (now.nudge > NO_NUDGE) {
    actions.nudge(now.nudge);
  }
};

const tickWith = Effect.fn("kikite.tick")(function* tickWith(actions: Actions) {
  const now = yield* due;
  trigger(actions, now);
  yield* fadeIfStale(now.stale);
});

const ticking = (actions: Actions): ReturnType<typeof tickWith> =>
  Effect.repeat(tickWith(actions), Schedule.spaced(TICK)).pipe(Effect.asVoid);

const interviewing = (phase: Phase): Effect.Effect<void> => {
  if (phase.status === "interview") {
    return Effect.void;
  }
  return Effect.interrupt;
};

const sessionAtom = runtime.atom(
  Effect.fnUntraced(function* session(get) {
    yield* interviewing(get(phaseAtom));
    yield* reset;
    yield* Effect.addFinalizer(() => release);
    const actions = yield* actionsFor;
    yield* startListening(actions);
    yield* holdScreen;
    yield* Effect.forkScoped(pipe(actions, ticking));
    yield* Effect.forkScoped(autosaving);
    const current: Session = actions;
    return current;
  }),
);

/** @internal */
export { sessionAtom };
export type { Session };
