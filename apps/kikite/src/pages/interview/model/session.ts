import { Effect, Schedule, pipe } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { actionsFor } from "./actions.ts";
import type { Actions } from "./actions.ts";
import { phaseAtom } from "./atoms.ts";
import type { Phase } from "./atoms.ts";
import { due } from "./due.ts";
import { release, reset, startListening } from "./lifecycle.ts";

type Session = Pick<Actions, "answer" | "ask" | "choose" | "save">;

const TICK = "250 millis";

const setupOf = Effect.fn("kikite.setupOf")(function* setupOf(phase: Phase) {
  if (phase.status === "interview") {
    return phase.setup;
  }
  return yield* Effect.interrupt;
});

const tickWith = (actions: Actions): typeof due =>
  pipe(
    due,
    Effect.tap((now) =>
      Effect.sync(() => {
        if (now.ask) {
          actions.ask();
        }
        if (now.summarize) {
          actions.summarize();
        }
      }),
    ),
  );

const runtime = Atom.runtime(FetchHttpClient.layer);

const sessionAtom = runtime.atom(
  Effect.fnUntraced(function* session(get) {
    const setup = yield* setupOf(get(phaseAtom));
    yield* reset;
    yield* Effect.addFinalizer(() => release);
    const actions = yield* actionsFor(setup);
    yield* startListening(actions);
    yield* Effect.forkScoped(Effect.repeat(tickWith(actions), Schedule.spaced(TICK)));
    actions.ask();
    const current: Session = actions;
    return current;
  }),
);

/** @internal */
export { sessionAtom };
export type { Session };
