import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import {
  TABLE_BODY_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CLASS,
  TABLE_CONTAINER_CLASS,
  TABLE_HEADER_CLASS,
  TABLE_ROW_CLASS,
  tableHeadVariants,
} from "@masseater.dev/ui/table-class";
import type { TableHeadVariant } from "@masseater.dev/ui/table-class";

import type { HtmlElement } from "#/shared/lib/element-types.ts";

const FOCUSABLE = "0";

/** @stability experimental */
export type TableLabel =
  | Readonly<{ label: string; labelledBy?: never }>
  | Readonly<{ labelledBy: string; label?: never }>;

/** @stability experimental */
export type TableOptions<Msg> = TableLabel &
  Readonly<{
    html: Html.H<Msg>;
    containerClass?: string;
    children: View.Children<Msg, never>;
  }>;

/** @stability experimental */
export const Table = <Msg>({
  html,
  label,
  labelledBy,
  containerClass,
  children,
}: TableOptions<Msg>): HtmlElement<Msg, "section"> =>
  html.section
    .class(TABLE_CONTAINER_CLASS, containerClass)
    .attrs({
      "data-slot": "table-container",
      "aria-label": label,
      "aria-labelledby": labelledBy,
      tabindex: FOCUSABLE,
    })
    .children(html.table.class(TABLE_CLASS).attr("data-slot", "table").children(children));

/** @stability experimental */
export const TableHeader = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "thead"> =>
  html.thead.class(TABLE_HEADER_CLASS).attr("data-slot", "table-header");

/** @stability experimental */
export const TableBody = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "tbody"> =>
  html.tbody.class(TABLE_BODY_CLASS).attr("data-slot", "table-body");

/** @stability experimental */
export const TableRow = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "tr"> =>
  html.tr.class(TABLE_ROW_CLASS).attr("data-slot", "table-row");

/** @stability experimental */
export const TableHead = <Msg>({
  html,
  variant,
}: Readonly<{ html: Html.H<Msg>; variant?: TableHeadVariant }>): HtmlElement<Msg, "th"> =>
  html.th.class(tableHeadVariants({ variant })).attrs({ "data-slot": "table-head", scope: "col" });

/** @stability experimental */
export const TableRowHead = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "th"> =>
  html.th
    .class(TABLE_CELL_CLASS, "text-left font-normal")
    .attrs({ "data-slot": "table-row-head", scope: "row" });

/** @stability experimental */
export const TableCell = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "td"> =>
  html.td.class(TABLE_CELL_CLASS).attr("data-slot", "table-cell");
