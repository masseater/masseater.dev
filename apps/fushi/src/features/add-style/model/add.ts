import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { SecureRandom } from "effect/crypto";
import { Atom, AtomRegistry } from "effect/reactivity";

import { BACH, changed, withStyle } from "#/entities/library/index.ts";
import { navigate, runtime } from "#/shared/lib/index.ts";

const ALL = "all";

const EMPTY = "";

/** @internal */
export const nameAtom = Atom.make(EMPTY).pipe(Atom.keepAlive);

const baselineOf = (baselines: readonly string[]): string =>
  pipe(
    Arr.findFirst(baselines, (name) => name === ALL),
    Option.getOrElse(() => BACH),
  );

const added = Effect.fnUntraced(function* added(baselines: readonly string[]) {
  const registry = yield* AtomRegistry.AtomRegistry;
  const name = Str.trim(registry.get(nameAtom));
  if (Str.isEmpty(name)) {
    return;
  }
  const random = yield* SecureRandom.SecureRandom;
  const id = yield* random.uuidV4();
  yield* changed(withStyle({ id, name, baseline: baselineOf(baselines) }));
  registry.set(nameAtom, EMPTY);
  navigate({ page: "import", style: id });
});

/** @internal */
export const addStyleAtom = runtime.fn(added);
