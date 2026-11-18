import { Option } from "effect";

import { asBare, extractFenced, extracted } from "./expressions.ts";

const START = 0;

export const conditionBare = (raw: string): string =>
  Option.match(extractFenced(raw)(START), {
    onNone: () => asBare(extracted(raw)),
    onSome: (found) => asBare(found.expr),
  });
