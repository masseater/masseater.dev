import { Array as Arr, Option, pipe } from "effect";

const SEPARATOR = "--";

/** @internal */
export type Invocation = Readonly<{ name: string; command: readonly [string, ...string[]] }>;

const commandOf = (rest: readonly string[]): Option.Option<Invocation["command"]> =>
  Arr.match(rest, { onEmpty: Option.none, onNonEmpty: Option.some });

/** @internal */
export const invocationOf = ([
  name,
  separator,
  ...rest
]: readonly string[]): Option.Option<Invocation> =>
  pipe(
    Option.fromNullishOr(name),
    Option.filter(() => separator === SEPARATOR),
    Option.flatMap((first) => Option.map(commandOf(rest), (command) => ({ name: first, command }))),
  );
