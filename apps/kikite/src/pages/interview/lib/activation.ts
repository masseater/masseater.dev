import { Effect } from "effect";
import type { Scope } from "effect";

const ACTIVATING = ["click", "keydown"] as const;

const activatedNow = (): boolean =>
  "userActivation" in navigator && navigator.userActivation.hasBeenActive;

const onActivation = (activate: () => void): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      for (const type of ACTIVATING) {
        globalThis.addEventListener(type, activate, { once: true });
      }
    }),
    () =>
      Effect.sync(() => {
        for (const type of ACTIVATING) {
          globalThis.removeEventListener(type, activate);
        }
      }),
  );

export { activatedNow, onActivation };
