import { openTape } from "@masseater.dev/daw-view";
import type { Tape, TapeShape } from "@masseater.dev/daw-view";
import { Effect, Exit, Option } from "effect";
import type { Scope } from "effect";

const opened = (shape: TapeShape): Effect.Effect<Option.Option<Tape>> =>
  Effect.option(Effect.tryPromise({ try: () => openTape(shape), catch: () => shape }));

export const tapeFor = (shape: TapeShape): Effect.Effect<Option.Option<Tape>, never, Scope.Scope> =>
  Effect.acquireRelease(opened(shape), (tape, exit) =>
    Effect.sync(() => {
      if (Exit.isFailure(exit) && Option.isSome(tape)) {
        tape.value.close();
      }
    }),
  );
