import { Schema } from "effect";

export type ViewNode =
  | Readonly<{ type: "Headline"; text: string }>
  | Readonly<{
      type: "Point";
      theme: string;
      text: string;
      days?: string;
      detail?: readonly ViewNode[];
    }>
  | Readonly<{ type: "Fold"; label: string; children: readonly ViewNode[] }>
  | Readonly<{ type: "Section"; title: string; children: readonly ViewNode[] }>
  | Readonly<{ type: "Text"; text: string }>
  | Readonly<{ type: "List"; items: readonly string[] }>
  | Readonly<{ type: "Links"; items: readonly Readonly<{ label: string; href: string }>[] }>;

const Line = Schema.NonEmptyString;

const Headline = Schema.Struct({
  type: Schema.Literal("Headline"),
  text: Line.annotate({
    description:
      "One sentence naming what the whole memo is about, e.g. 監査の定期タスクを4つにまとめた週",
  }),
}).annotate({ description: "The line a reader scans first. One per view, at the top" });

const Text = Schema.Struct({ type: Schema.Literal("Text"), text: Line });

const List = Schema.Struct({
  type: Schema.Literal("List"),
  items: Schema.NonEmptyArray(Line),
});

const LinkItem = Schema.Struct({
  label: Line,
  href: Schema.String.check(Schema.isPattern(/^https:\/\//u)),
});

const Links = Schema.Struct({
  type: Schema.Literal("Links"),
  items: Schema.NonEmptyArray(LinkItem),
}).annotate({ description: "Evidence such as pull requests or published pages" });

const unionOf = (child: () => Schema.Codec<ViewNode>): Schema.Codec<ViewNode> => {
  const children = Schema.Array(Schema.suspend(child));
  const detail = children.annotate({ description: "Shown when the reader clicks the point" });
  const point = Schema.Struct({
    type: Schema.Literal("Point"),
    theme: Line.annotate({ description: "One or two words naming the subject, e.g. CI, ポータル" }),
    text: Line.annotate({ description: "What became possible or was done, one short sentence" }),
    days: Schema.optionalKey(
      Line.annotate({ description: "Weekdays it happened, e.g. 水 or 火–水" }),
    ),
    detail: Schema.optionalKey(detail),
  }).annotate({ description: "One outcome. Keep three or fewer at the top level" });
  const fold = Schema.Struct({
    type: Schema.Literal("Fold"),
    label: Line.annotate({ description: "What opens, e.g. 決めたこと・持ち越し・根拠" }),
    children,
  }).annotate({ description: "Closed until clicked. Put background, decisions and evidence here" });
  const section = Schema.Struct({
    type: Schema.Literal("Section"),
    title: Line,
    children,
  }).annotate({ description: "A titled group, used inside a Fold or a Point detail" });
  return Schema.Union([Headline, point, fold, section, Text, List, Links]);
};

const ViewNodeSchema: Schema.Codec<ViewNode> = unionOf(() => ViewNodeSchema);

export const MemoView = Schema.Array(ViewNodeSchema).annotate({
  description:
    "UI for the memo as a tree of components. The portal renders it instead of reading the Markdown",
});

export type MemoViewValue = typeof MemoView.Type;
