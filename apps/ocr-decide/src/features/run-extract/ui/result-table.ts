import type { Html } from "@effect/ui/html";
import { Table, TableBody, TableCell, TableRow, TableRowHead } from "@masseater.dev/effect-ui";
import type { HtmlElement } from "@masseater.dev/effect-ui";
import { Array as Arr, pipe } from "effect";

import type { Line } from "#/entities/extraction/index.ts";
import { COPY } from "#/shared/config/index.ts";

const ResultRow = <Msg>(html: Html.H<Msg>, { label, value }: Line): HtmlElement<Msg, "tr"> =>
  TableRow(html)
    .key(label)
    .children(
      TableRowHead(html).class("text-muted-foreground").children(label),
      TableCell(html).children(value),
    );

/** @stability experimental */
export const ResultTable = <Msg>({
  html,
  lines,
}: Readonly<{ html: Html.H<Msg>; lines: readonly Line[] }>): HtmlElement<Msg, "section"> => {
  const rows = pipe(
    lines,
    Arr.map((line) => ResultRow(html, line)),
  );
  return Table({
    html,
    label: COPY.result,
    containerClass: "rounded-lg border",
    children: [TableBody(html).children(rows)],
  });
};
