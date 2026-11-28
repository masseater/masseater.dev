import { Array as Arr, Option, pipe } from "effect";

const pathOf = (url: string | null): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(url),
    Option.map((href) => new URL(href).pathname),
  );

export const skipTransitionsTo =
  (paths: readonly string[]) =>
  ({
    activation,
    viewTransition,
  }: Readonly<{
    activation: Readonly<{ entry: Readonly<{ url: string | null }> }> | null;
    viewTransition: Readonly<{ skipTransition: () => void }> | null;
  }>): void => {
    const transition = Option.fromNullishOr(viewTransition);
    const leavesForFile = pipe(
      Option.fromNullishOr(activation),
      Option.flatMap(({ entry }) => pathOf(entry.url)),
      Option.exists((path) => Arr.contains(paths, path)),
    );
    if (Option.isSome(transition) && leavesForFile) {
      transition.value.skipTransition();
    }
  };
