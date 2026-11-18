import { Array as Arr, Option, pipe } from "effect";

import type { Diagnostic } from "#/shared/config/index.ts";

export const format = (diagnostic: Diagnostic): string => {
  const column = pipe(
    Option.fromNullishOr(diagnostic.column),
    Option.match({ onNone: () => "", onSome: (value) => `:${String(value)}` }),
  );
  const detail = pipe(
    [diagnostic.detail],
    Arr.flatMap((part) => Option.toArray(Option.fromNullishOr(part))),
    Arr.map((part) => ` [${part}]`),
    Arr.join(""),
  );
  return `${diagnostic.path}:${String(diagnostic.line)}${column} ${diagnostic.severity} ${diagnostic.rule} ${diagnostic.message}${detail}`;
};
