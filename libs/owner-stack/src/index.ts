import { State } from "alchemy/State";
import type { StateService } from "alchemy/State";
import { Array as Arr, Effect, Option, Predicate } from "effect";

const PROD = "prod";
const OWNER_POLICY = "OwnerPolicy";

type StackRef = Readonly<{ stack: string; stage: string }>;

const holdsOwnerPolicy =
  (state: Readonly<StateService>) =>
  (stack: string): Effect.Effect<boolean> =>
    state
      .get({ stack, stage: PROD, fqn: OWNER_POLICY })
      .pipe(Effect.map(Predicate.isNotUndefined), Effect.orDie);

const holdersOf = (state: Readonly<StateService>): Effect.Effect<readonly string[]> =>
  state.listStacks().pipe(
    Effect.orDie,
    Effect.flatMap((stacks) =>
      Effect.filter(stacks, holdsOwnerPolicy(state), { concurrency: "unbounded" }),
    ),
  );

const onlyHolder = (holders: readonly string[]): Effect.Effect<StackRef> =>
  Arr.match(holders, {
    onEmpty: () => Effect.die(new Error(`No stack holds ${OWNER_POLICY} at ${PROD}`)),
    onNonEmpty: ([stack, ...rest]) =>
      Arr.match(rest, {
        onEmpty: () => Effect.succeed({ stack, stage: PROD }),
        onNonEmpty: () =>
          Effect.die(new Error(`${String(holders.length)} stacks hold ${OWNER_POLICY}`)),
      }),
  });

const stateOf = Option.match({
  onNone: (): Effect.Effect<StateService> => Effect.die(new Error("The stack has no state store")),
  onSome: (state: Effect.Effect<StateService>) => state,
});

const ownerStack: Effect.Effect<StackRef> = Effect.serviceOption(State).pipe(
  Effect.flatMap(stateOf),
  Effect.flatMap(holdersOf),
  Effect.flatMap(onlyHolder),
);

export { ownerStack };
export type { StackRef };
