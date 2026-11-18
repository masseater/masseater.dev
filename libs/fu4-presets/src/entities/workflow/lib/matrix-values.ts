import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import type {
  MatrixCombination,
  MatrixCombinations,
  MatrixRow,
} from "#/entities/workflow/model/job-types.ts";
import { optional } from "#/shared/record/index.ts";
import { quote } from "#/shared/text/index.ts";

import { parseMapping } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseRawValue, rawEntries } from "./raw-value.ts";
import { parseExpression } from "./scalar.ts";
import { checkSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

const combination =
  (sink: Sink, section: string) =>
  (child: YamlNode): Option.Option<MatrixCombination> => {
    if (child.kind === "scalar") {
      return Option.map(
        parseExpression(sink)(child, "mapping of matrix combination"),
        (expression): MatrixCombination => ({ assigns: {}, expression }),
      );
    }
    const entries = parseMapping(sink)({
      place: `element in ${quote(section)} section`,
      node: child,
      allowEmpty: false,
      caseSensitive: false,
    });
    const assigns = rawEntries((entry) =>
      Option.map(parseRawValue(sink)(entry.value), (value) => ({ key: entry.key, value })),
    )(entries);
    return Option.some({ assigns });
  };

export const combinations =
  (sink: Sink) =>
  (section: string, entry: Entry): Option.Option<MatrixCombinations> => {
    const node = entry.value;
    if (node.kind === "scalar") {
      return Option.some({
        combinations: [],
        ...optional("expression")(parseExpression(sink)(node, "array of matrix combination")),
      });
    }
    if (!checkSequence(sink)({ section, node, allowEmpty: false })) {
      return Option.none();
    }
    return Option.some({
      combinations: pipe(
        node.children,
        Arr.flatMap((child) => Option.toArray(combination(sink, section)(child))),
      ),
    });
  };

export const row =
  (sink: Sink) =>
  (entry: Entry): Option.Option<MatrixRow> => {
    if (entry.value.kind === "scalar") {
      const expression = parseExpression(sink)(entry.value, "array value for matrix variations");
      return Option.some({ values: [], ...optional("expression")(expression) });
    }
    if (!checkSequence(sink)({ section: "matrix values", node: entry.value, allowEmpty: false })) {
      return Option.none();
    }
    return Option.some({
      name: entry.key,
      values: pipe(
        entry.value.children,
        Arr.flatMap((child) => Option.toArray(parseRawValue(sink)(child))),
      ),
    });
  };
