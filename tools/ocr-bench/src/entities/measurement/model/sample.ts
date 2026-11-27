import { Option, Schema } from "effect";

export const KINDS = ["receipt", "invoice"] as const;

export const CONDITIONS = ["clean", "degraded"] as const;

const DocumentSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(KINDS),
  condition: Schema.Literals(CONDITIONS),
  truth: Schema.Record(Schema.String, Schema.String),
  recipient: Schema.String,
  phone: Schema.String,
  dueDate: Schema.String,
  time: Schema.String,
  items: Schema.Array(
    Schema.Struct({ name: Schema.String, quantity: Schema.Finite, amount: Schema.String }),
  ),
  subtotal: Schema.String,
  paid: Schema.String,
  change: Schema.String,
  font: Schema.String,
  tilt: Schema.Finite,
});

export const DocumentsSchema = DocumentSchema.pipe(Schema.Array, Schema.fromJsonString);

export type Document = typeof DocumentSchema.Type;

export const truthOf = ({
  document,
  field,
}: Readonly<{ document: Document; field: string }>): string =>
  Option.fromNullishOr(document.truth[field]).pipe(Option.getOrElse(() => ""));
