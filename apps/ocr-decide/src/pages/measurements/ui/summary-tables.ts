import type { Html } from "@effect/ui/html";
import type { HtmlElement } from "@masseater.dev/effect-ui";
import type { Summary } from "@ocr-decide/measurements/schema";
import { Array as Arr, pipe } from "effect";

import { COPY } from "#/pages/measurements/model/copy.ts";
import { keyOf, wayOf } from "#/pages/measurements/model/summary.ts";
import { tablesOf } from "#/pages/measurements/model/tables.ts";
import { ValueTable } from "#/shared/ui/value-table.ts";

/** @stability experimental */
export const SummaryTables = <Msg>({
  html,
  summary,
}: Readonly<{ html: Html.H<Msg>; summary: Summary }>): readonly HtmlElement<Msg, "section">[] =>
  pipe(
    tablesOf(summary),
    Arr.map(({ id, title, columns }) =>
      ValueTable({
        html,
        id,
        title,
        corner: COPY.way,
        rows: summary.runs,
        columns,
        rowKey: keyOf,
        rowLabel: wayOf,
      }),
    ),
  );
