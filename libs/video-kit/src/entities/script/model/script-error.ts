import { Option, Schema, pipe } from "effect";

import { ONE } from "#/shared/config/index.ts";

const taggedError = Schema.TaggedError;

export class ScriptError extends taggedError<ScriptError, { readonly brand: unique symbol }>()(
  "ScriptError",
  {
    line: Schema.Finite,
    message: Schema.String,
  },
) {}

export interface Located {
  readonly position?: Readonly<{ start: Readonly<{ line: number }> }> | undefined;
}

export const lineOf = (node: Located): number =>
  pipe(
    Option.fromNullishOr(node.position),
    Option.map(({ start }) => start.line),
    Option.getOrElse(() => ONE),
  );

export const errorAt = ({
  node,
  message,
}: Readonly<{ node: Located; message: string }>): ScriptError =>
  ScriptError.make({ line: lineOf(node), message });
