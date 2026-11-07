import { parse } from "ass-compiler";
import { Option, Result, Array as Arr, pipe } from "effect";

import { proseUnitsOf } from "./located.ts";
import type { Parser, Unit } from "./parser.ts";

const SCRIPT_INFO = /^\[Script Info\]/mu;

const textsOf = (text: string): readonly string[] =>
  Result.match(
    Result.try(() => parse(text)),
    {
      onFailure: () => [],
      onSuccess: ({ info, events }) => [
        ...Option.toArray(Option.fromNullishOr(info.Title)),
        ...pipe(
          [...events.dialogue, ...events.comment],
          Arr.map(({ Text }) => Text.raw),
        ),
      ],
    },
  );

const assUnitsOf = (text: string): readonly Unit[] => proseUnitsOf({ text })(textsOf(text));

const assParser: Parser = {
  format: "ass",
  extensions: [".ass", ".ssa"],
  aliases: ["ssa"],
  accepts: (text) => SCRIPT_INFO.test(text),
  unitsOf: assUnitsOf,
};

export { assParser };
