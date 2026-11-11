import { Effect, Schedule, pipe } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { onActivation } from "#/pages/interview/lib/activation";
import { holdScreen } from "#/pages/interview/lib/screen-hold";

import { actionsFor } from "./actions.ts";
import type { Actions } from "./actions.ts";
import { phaseAtom, staleAtom } from "./atoms.ts";
import type { Phase } from "./atoms.ts";
import { due } from "./due.ts";
import type { Due } from "./due.ts";
import { release, reset, startListening } from "./lifecycle.ts";
import { read, write } from "./registry.ts";

type Session = Pick<Actions, "typed" | "typing">;

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

const runtime = Atom.runtime(FetchHttpClient.layer);

const sessionAtom = runtime.atom(
  Effect.fnUntraced(function* session(get) {
    yield* interviewing(get(phaseAtom));
    yield* reset;
    yield* Effect.addFinalizer(() => release);
    const actions = yield* actionsFor;
    yield* startListening(actions);
    yield* holdScreen;
    yield* onActivation(actions.activate);
    yield* Effect.forkScoped(pipe(actions, ticking));
    const current: Session = actions;
    return current;
  }),
);

/** @internal */
export { sessionAtom };
export type { Session };
