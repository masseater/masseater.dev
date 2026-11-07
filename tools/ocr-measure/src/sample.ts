import { Option, Schema } from "effect";

const KINDS = ["receipt", "invoice"] as const;

const CONDITIONS = ["clean", "degraded"] as const;

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

const DocumentsSchema = Schema.fromJsonString(Schema.Array(DocumentSchema));

type Document = typeof DocumentSchema.Type;

const truthOf = ({ document, field }: Readonly<{ document: Document; field: string }>): string =>
  Option.fromNullishOr(document.truth[field]).pipe(Option.getOrElse(() => ""));

export { CONDITIONS, DocumentsSchema, KINDS, truthOf };
export type { Document };
