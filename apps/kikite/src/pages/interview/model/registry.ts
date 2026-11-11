import { Effect, pipe } from "effect";
import { dual } from "effect/Function";
import { AtomRegistry } from "effect/reactivity";
import type { Atom } from "effect/reactivity";

const DATA_FIRST_ARITY = 2;

type Registered<Value> = Effect.Effect<Value, never, AtomRegistry.AtomRegistry>;

const read = <Value>(atom: Atom.Atom<Value>): Registered<Value> =>
  pipe(
    AtomRegistry.AtomRegistry,
    Effect.map((registry) => registry.get(atom)),
  );

const write: {
  <Value>(value: Value): (atom: Atom.Writable<Value>) => Registered<void>;
  <Value>(atom: Atom.Writable<Value>, value: Value): Registered<void>;
} = dual(DATA_FIRST_ARITY, <Value>(atom: Atom.Writable<Value>, value: Value): Registered<void> =>
  pipe(
    AtomRegistry.AtomRegistry,
    Effect.flatMap((registry) =>
      Effect.sync(() => {
        registry.set(atom, value);
      }),
    ),
  ),
);

const modify: {
  <Value>(update: (current: Value) => Value): (atom: Atom.Writable<Value>) => Registered<void>;
  <Value>(atom: Atom.Writable<Value>, update: (current: Value) => Value): Registered<void>;
} = dual(
  DATA_FIRST_ARITY,
  <Value>(atom: Atom.Writable<Value>, update: (current: Value) => Value): Registered<void> =>
    pipe(
      AtomRegistry.AtomRegistry,
      Effect.flatMap((registry) =>
        Effect.sync(() => {
          registry.update(atom, update);
        }),
      ),
    ),
);

/** @internal */
export { modify, read, write };
