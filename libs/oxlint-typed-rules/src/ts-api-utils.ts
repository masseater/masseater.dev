import { Option } from "effect";

import type { CompatType } from "./compat-type.ts";

export const unionConstituents = (type: CompatType): readonly CompatType[] =>
  Option.liftPredicate(type, (candidate) => candidate.isUnion()).pipe(
    Option.match({ onSome: ({ types }) => types, onNone: () => [type] }),
  );
