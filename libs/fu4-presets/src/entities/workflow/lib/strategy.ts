import type { YamlNode } from "@r_masseater/fu4";
import { Option, Predicate } from "effect";

import type { Strategy } from "#/entities/workflow/model/job-types.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import type { Entry } from "./mapping.ts";
import { parseSection } from "./mapping.ts";
import { parseMatrix } from "./matrix.ts";
import { parseBool, parseInteger } from "./scalar.ts";
import type { Sink } from "./sink.ts";

const ZERO = 0;

const maxParallel =
  (sink: Sink) =>
  (entry: Entry): ReturnType<ReturnType<typeof parseInteger>> => {
    const parsed = parseInteger(sink)(entry.value);
    if (
      Option.isSome(parsed) &&
      Predicate.isUndefined(parsed.value.expression) &&
      parsed.value.value <= ZERO
    ) {
      sink.error(
        entry.value,
        `value at "max-parallel" must be greater than zero: ${String(parsed.value.value)}`,
      );
    }
    return parsed;
  };

export const parseStrategy =
  (sink: Sink) =>
  (node: YamlNode): Strategy => {
    const { setSome } = setters<Strategy>();
    return foldEntries<Strategy>({
      entries: parseSection(sink)({
        section: "strategy",
        node,
        allowEmpty: false,
        caseSensitive: true,
      }),
      initial: {},
      handlers: [
        [
          "matrix",
          setSome("matrix", (entry) => Option.some(parseMatrix(sink)(entry.key, entry.value))),
        ],
        ["fail-fast", setSome("failFast", (entry) => parseBool(sink)(entry.value))],
        ["max-parallel", setSome("maxParallel", maxParallel(sink))],
      ],
      unknown: rejecting({
        sink,
        section: "strategy",
        expected: ["matrix", "fail-fast", "max-parallel"],
      }),
    });
  };
