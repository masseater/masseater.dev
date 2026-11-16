import { Array as Arr, Option, pipe } from "effect";

import type { Diagnostic } from "#/shared/config/index.ts";

export const format = (diagnostic: Diagnostic): string => {
  const column = pipe(
    Option.fromNullishOr(diagnostic.column),
    Option.map((value) => `:${String(value)}`),
    Option.getOrElse(() => ""),
  );
  const detail = pipe(
    [diagnostic.detail, diagnostic.context],
    Arr.flatMap((part) => Option.toArray(Option.fromNullishOr(part))),
    Arr.filter((part) => part !== ""),
    Arr.map((part) => ` [${part}]`),
    Arr.join(""),
  );
  return `${diagnostic.path}:${String(diagnostic.line)}${column} ${diagnostic.severity} ${diagnostic.rule} ${diagnostic.message}${detail}`;
};
