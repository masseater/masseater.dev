import { Effect, Option } from "effect";

const requireAuthSuccess = ({
  error,
}: Readonly<{ error: Readonly<{ status: number }> | null }>): Effect.Effect<void> =>
  Option.match(Option.fromNullishOr(error), {
    onNone: () => Effect.void,
    onSome: (failure) => Effect.die(failure),
  });

export { requireAuthSuccess };
