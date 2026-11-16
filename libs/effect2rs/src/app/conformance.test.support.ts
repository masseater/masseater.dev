import { Schema } from "effect";

const MINIMUM = 0;

const Kind = Schema.Literals(["first-kind", "second-kind"]).annotate({
  identifier: "Kind",
});

const Mixed = Schema.Literals(["a-b", "c_d", "plain"]).annotate({ identifier: "Mixed" });

const Level = Schema.Literals(["LOW", "VERY_HIGH"]).annotate({ identifier: "Level" });

const UserId = Schema.String.pipe(Schema.brand("UserId")).annotate({ identifier: "UserId" });

const Timestamp = Schema.Int.annotate({ identifier: "Timestamp" });

const Shape = Schema.Union([
  Schema.TaggedStruct("Circle", { radius: Schema.Finite }),
  Schema.TaggedStruct("Label", { textValue: Schema.String, level: Level }),
  Schema.TaggedStruct("Stamped", { at: Timestamp }),
  Schema.TaggedStruct("Empty", {}),
]).annotate({ identifier: "Shape" });

interface TreeType {
  readonly label: string;
  readonly children: readonly TreeType[];
}

const Tree = Schema.Struct({
  label: Schema.String,
  children: Schema.Array(Schema.suspend((): Schema.Codec<TreeType> => Tree)),
}).annotate({ identifier: "Tree" });

const Awkward = Schema.Literals([
  "self",
  "Self",
  "1x",
  "with space",
  "ä",
  "crate",
  "type",
]).annotate({ identifier: "Awkward" });

const Keys = Schema.Struct({
  "1st": Schema.String,
  self: Schema.String,
  Self: Schema.String,
  "with-dash": Schema.String,
  über: Schema.String,
  "-ü": Schema.String,
  _private: Schema.String,
  crate: Schema.String,
  type: Schema.String,
  super: Schema.String,
}).annotate({ identifier: "Keys" });

const Odd = Schema.Union([
  Schema.TaggedStruct("self", {}),
  Schema.TaggedStruct("Self", { self: Schema.String }),
]).annotate({ identifier: "Odd" });

const Point = Schema.Struct({
  updatedAt: Schema.Int,
  type: Schema.String,
  URL: Schema.String,
  count: Schema.Finite.check(Schema.isUint32()),
  offset: Schema.Finite.check(Schema.isInt32()),
  total: Schema.Int.check(Schema.isGreaterThanOrEqualTo(MINIMUM)),
  ratio: Schema.Finite,
  title: Schema.NullOr(Schema.String),
  note: Schema.optionalKey(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  byKind: Schema.Record(Schema.String, Kind),
  pair: Schema.Tuple([Schema.String, Schema.Boolean]),
  extra: Schema.Unknown,
  shape: Shape,
  owner: UserId,
  seen: Timestamp,
  at: Schema.DateTimeUtcFromString,
  maybeKind: Schema.NullOr(Kind),
}).annotate({ identifier: "Point" });

export const Samples = Schema.Struct({
  points: Schema.Array(Point),
  shapes: Schema.Array(Shape),
  trees: Schema.Array(Tree),
  kinds: Schema.Array(Kind),
  mixed: Schema.Array(Mixed),
  levels: Schema.Array(Level),
  awkward: Schema.Array(Awkward),
  keys: Schema.Array(Keys),
  odd: Schema.Array(Odd),
}).annotate({ identifier: "Samples" });

export const conformance = {
  CONFORMANCE_ORIGIN: "https://example.test",
  retryCount: 3,
  strict: true,
  Kind,
  Mixed,
  Level,
  UserId,
  Timestamp,
  Shape,
  Tree,
  Awkward,
  Keys,
  Odd,
  Point,
  Samples,
};
