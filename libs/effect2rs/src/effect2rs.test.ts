import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { toRust } from "./index.ts";
import type { UnsupportedSchema } from "./index.ts";

const HEADER = "// test";
const MINIMUM = 0;

const rust = (
  definitions: Readonly<Record<string, unknown>>,
  derive: readonly string[] = [],
): Effect.Effect<string, UnsupportedSchema> => toRust({ definitions, header: HEADER, derive });

const failure = (
  definitions: Readonly<Record<string, unknown>>,
): Effect.Effect<UnsupportedSchema, string> => Effect.flip(toRust({ definitions, header: HEADER }));

it.effect("a struct renames camelCase keys and keeps keyword fields valid", () =>
  Effect.gen(function* body() {
    const Point = Schema.Struct({
      updatedAt: Schema.Int,
      type: Schema.String,
      URL: Schema.String,
    }).annotate({ identifier: "Point" });
    const source = yield* rust({ Point });
    expect(source).toContain(`#[serde(rename_all = "camelCase")]
pub struct Point {
    pub updated_at: i64,
    pub r#type: String,
    #[serde(rename = "URL")]
    pub url: String,
}`);
  }),
);

it.effect("integer checks pick the narrowest Rust integer and plain numbers become f64", () =>
  Effect.gen(function* body() {
    const Sizes = Schema.Struct({
      count: Schema.Finite.check(Schema.isUint32()),
      offset: Schema.Finite.check(Schema.isInt32()),
      total: Schema.Int.check(Schema.isGreaterThanOrEqualTo(MINIMUM)),
      ratio: Schema.Finite,
    }).annotate({ identifier: "Sizes" });
    const source = yield* rust({ Sizes });
    expect(source).toContain("pub count: u32,");
    expect(source).toContain("pub offset: i32,");
    expect(source).toContain("pub total: u64,");
    expect(source).toContain("pub ratio: f64,");
    expect(source).toContain("#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]");
  }),
);

it.effect("null becomes Option and a missing key is skipped when serializing", () =>
  Effect.gen(function* body() {
    const Draft = Schema.Struct({
      title: Schema.NullOr(Schema.String),
      note: Schema.optionalKey(Schema.String),
      tags: Schema.optional(Schema.Array(Schema.String)),
    }).annotate({ identifier: "Draft" });
    const source = yield* rust({ Draft });
    expect(source).toContain(`pub struct Draft {
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}`);
  }),
);

it.effect("string literals become an enum with the serde rule that reproduces them", () =>
  Effect.gen(function* body() {
    const Reaction = Schema.Literals(["draft-accepted", "remark-dismissed"]);
    const Mixed = Schema.Literals(["a-b", "c_d"]);
    const source = yield* rust({ Reaction, Mixed });
    expect(source).toContain(`#[serde(rename_all = "kebab-case")]
pub enum Reaction {
    DraftAccepted,
    RemarkDismissed,
}`);
    expect(source).toContain(`pub enum Mixed {
    #[serde(rename = "a-b")]
    AB,
    #[serde(rename = "c_d")]
    CD,
}`);
    expect(source).toContain(`"draft-accepted" => Some(Self::DraftAccepted),`);
    expect(source).toContain(`Self::RemarkDismissed => "remark-dismissed",`);
  }),
);

it.effect("a union of structs sharing a literal key becomes an internally tagged enum", () =>
  Effect.gen(function* body() {
    const Shape = Schema.Union([
      Schema.TaggedStruct("Circle", { radius: Schema.Finite }),
      Schema.TaggedStruct("Label", { textValue: Schema.String }),
      Schema.TaggedStruct("Empty", {}),
    ]).annotate({ identifier: "Shape" });
    const source = yield* rust({ Shape });
    expect(source).toContain(`#[serde(tag = "_tag")]
pub enum Shape {
    Circle {
        radius: f64,
    },
    #[serde(rename_all = "camelCase")]
    Label {
        text_value: String,
    },
    Empty,
}`);
  }),
);

it.effect("references to named schemas, records, and tuples keep their names", () =>
  Effect.gen(function* body() {
    const Kind = Schema.Literals(["a", "b"]).annotate({ identifier: "Kind" });
    const Bag = Schema.Struct({
      byKind: Schema.Record(Schema.String, Kind),
      pair: Schema.Tuple([Schema.String, Schema.Boolean]),
      extra: Schema.Unknown,
    });
    const source = yield* rust({ Bag });
    expect(source).toContain("use std::collections::BTreeMap;");
    expect(source).toContain("pub by_kind: BTreeMap<String, Kind>,");
    expect(source).toContain("pub pair: (String, bool),");
    expect(source).toContain("pub extra: serde_json::Value,");
    expect(source).toContain("pub enum Kind {");
  }),
);

it.effect("the wire form of a transformation is generated", () =>
  Effect.gen(function* body() {
    const Stamp = Schema.Struct({ at: Schema.DateTimeUtcFromString }).annotate({
      identifier: "Stamp",
    });
    const source = yield* rust({ Stamp });
    expect(source).toContain("pub at: String,");
  }),
);

it.effect("an identified primitive becomes a type alias and unnamed primitives are skipped", () =>
  Effect.gen(function* body() {
    const UserId = Schema.String.pipe(Schema.brand("UserId")).annotate({ identifier: "UserId" });
    const Plain = Schema.String;
    const User = Schema.Struct({ id: UserId, name: Plain });
    const source = yield* rust({ UserId, Plain, User });
    expect(source).toContain("pub type UserId = String;");
    expect(source).toContain("pub id: UserId,");
    expect(source).not.toContain("Plain");
  }),
);

it.effect("specta gets a number override for 64-bit integers", () =>
  Effect.gen(function* body() {
    const Clock = Schema.Struct({ at: Schema.Int, maybe: Schema.NullOr(Schema.Int) });
    const source = yield* rust({ Clock }, ["specta::Type"]);
    expect(source).toContain("use specta::Type;");
    expect(source).toContain(`    #[specta(type = specta_typescript::Number)]
    pub at: i64,`);
    expect(source).toContain(`    #[specta(type = Option<specta_typescript::Number>)]
    pub maybe: Option<i64>,`);
  }),
);

it.effect("plain values become constants", () =>
  Effect.gen(function* body() {
    const source = yield* rust({
      SYNC_ORIGIN: 'https://a "b"',
      retryCount: 3,
      enabled: true,
      ratio: 0.5,
    });
    expect(source).toBe(
      `// test

pub const SYNC_ORIGIN: &str = "https://a \\"b\\"";
pub const RETRY_COUNT: i64 = 3;
pub const ENABLED: bool = true;
pub const RATIO: f64 = 0.5;
`,
    );
  }),
);

it.effect("an anonymous nested struct is refused with its path", () =>
  Effect.gen(function* body() {
    const Outer = Schema.Struct({ inner: Schema.Struct({ text: Schema.String }) });
    const refused = yield* failure({ Outer });
    expect(refused).toMatchObject({
      path: "Outer.inner",
      reason: "a struct needs an identifier",
    });
  }),
);

it.effect("two different schemas under one name are refused", () =>
  Effect.gen(function* body() {
    const First = Schema.Struct({ text: Schema.String }).annotate({ identifier: "Same" });
    const Second = Schema.Struct({ other: Schema.String }).annotate({ identifier: "Same" });
    const refused = yield* failure({ First, Second });
    expect(refused).toMatchObject({ path: "Same_1" });
  }),
);
