import type { Html } from "@effect/ui/html";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
} from "@masseater.dev/effect-ui";
import type { HtmlElement } from "@masseater.dev/effect-ui";
import { Array as Arr, pipe } from "effect";

/** @stability experimental */
export interface Column<Row> {
  readonly id: string;
  readonly label: string;
  readonly cell: (row: Row) => string;
}

/** @stability experimental */
export interface ValueTableOptions<Msg, Row> {
  readonly html: Html.H<Msg>;
  readonly id: string;
  readonly title: string;
  readonly corner: string;
  readonly rows: readonly Row[];
  readonly columns: readonly Column<Row>[];
  readonly rowKey: (row: Row) => string;
  readonly rowLabel: (row: Row) => string;
}

const HeadingRow = <Msg, Row>({
  html,
  corner,
  columns,
}: Pick<ValueTableOptions<Msg, Row>, "html" | "corner" | "columns">): HtmlElement<Msg, "thead"> => {
  const heads = pipe(
    columns,
    Arr.map(({ id, label }) => TableHead({ html, variant: "compact" }).key(id).children(label)),
  );
  return TableHeader(html).children(
    TableRow(html).children(TableHead({ html, variant: "compact" }).children(corner), heads),
  );
};

const DataRow = <Msg, Row>(
  { html, columns, rowKey, rowLabel }: ValueTableOptions<Msg, Row>,
  row: Row,
): HtmlElement<Msg, "tr"> => {
  const cells = pipe(
    columns,
    Arr.map(({ id, cell }) => TableCell(html).key(id).class("font-mono").children(cell(row))),
  );
  return TableRow(html)
    .key(rowKey(row))
    .children(TableRowHead(html).children(rowLabel(row)), cells);
};

/** @stability experimental */
export const ValueTable = <Msg, Row>(
  options: ValueTableOptions<Msg, Row>,
): HtmlElement<Msg, "section"> => {
  const { html, id, title, rows } = options;
  const titleId = html.id(`${id}-title`);
  const body = pipe(
    rows,
    Arr.map((row) => DataRow(options, row)),
  );
  const table = Table({
    html,
    labelledBy: titleId,
    containerClass: "rounded-lg border",
    children: [HeadingRow(options), TableBody(html).children(body)],
  });
  return html.section
    .class("flex flex-col gap-3")
    .children(html.h2.id(titleId).class("text-lg font-bold").children(title), table);
};
