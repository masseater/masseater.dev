import type { Position, YamlNode } from "@r_masseater/fu4";
import { Option, Record as Rec } from "effect";

import type { Matrix } from "#/entities/workflow/model/job-types.ts";
import { optional } from "#/shared/record/index.ts";

import { foldEntries, setters } from "./fold.ts";
import type { Handler } from "./fold.ts";
import { parseSection, sortedRecord } from "./mapping.ts";
import { combinations, row } from "./matrix-values.ts";
import { parseExpression } from "./scalar.ts";
import type { Sink } from "./sink.ts";

const addRow =
  (sink: Sink): Handler<Matrix> =>
  (state, entry) =>
    Option.match(row(sink)(entry), {
      onNone: () => state,
      onSome: (value): Matrix => ({ ...state, rows: { ...state.rows, [entry.id]: value } }),
    });

const emptyMatrix = (at: Position): Matrix => ({ rows: {}, line: at.line, column: at.column });

export const parseMatrix =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Matrix => {
    if (node.kind === "scalar") {
      return {
        ...emptyMatrix(node),
        ...optional("expression")(parseExpression(sink)(node, "matrix")),
      };
    }
    const { setSome } = setters<Matrix>();
    const matrix = foldEntries<Matrix>({
      entries: parseSection(sink)({
        section: "matrix",
        node,
        allowEmpty: false,
        caseSensitive: false,
      }),
      initial: emptyMatrix(at),
      handlers: [
        ["include", setSome("include", (entry) => combinations(sink)("include", entry))],
        ["exclude", setSome("exclude", (entry) => combinations(sink)("exclude", entry))],
      ],
      unknown: addRow(sink),
    });
    return { ...matrix, rows: sortedRecord(Rec.toEntries(matrix.rows)) };
  };
