import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { rust, rustWith } from "./effect2rs.test.support.ts";

it.effect("specta treats JSON values as unknown and sees through 64-bit aliases", () =>
  Effect.gen(function* body() {
    const Stamp = Schema.Int.annotate({ identifier: "Stamp" });
    const Event = Schema.Struct({
      at: Stamp,
      payload: Schema.Unknown,
      count: Schema.Finite.check(Schema.isUint32()),
    }).annotate({ identifier: "Event" });
    const source = yield* rustWith(["specta::Type"])({ Stamp, Event });
    expect(source).toContain("pub type Stamp = i64;");
    expect(source).toContain(`    #[specta(type = specta_typescript::Number)]
    pub at: Stamp,`);
    expect(source).toContain(`    #[specta(type = specta_typescript::Unknown)]
    pub payload: serde_json::Value,`);
    expect(source).toContain(`    pub count: u32,`);
    expect(source).not.toContain("#[specta(type = u32)]");
  }),
);

it.effect("without specta no specta attributes are written", () =>
  Effect.gen(function* body() {
    const Event = Schema.Struct({ at: Schema.Int, payload: Schema.Unknown }).annotate({
      identifier: "Event",
    });
    const source = yield* rust({ Event });
    expect(source).not.toContain("specta");
  }),
);

it.effect("a nullable enum becomes Option and a recursive struct is boxed", () =>
  Effect.gen(function* body() {
    interface Node {
      readonly kind: "leaf" | "branch" | null;
      readonly children: readonly Node[];
    }
    const Kind = Schema.Literals(["leaf", "branch"]).annotate({ identifier: "Kind" });
    const NodeSchema = Schema.Struct({
      kind: Schema.NullOr(Kind),
      children: Schema.Array(Schema.suspend((): Schema.Codec<Node> => NodeSchema)),
    }).annotate({ identifier: "Node" });
    const source = yield* rust({ Node: NodeSchema });
    expect(source).toContain("pub kind: Option<Kind>,");
    expect(source).toContain("pub children: Vec<Box<Node>>,");
    expect(source).toContain(`#[serde(rename_all = "lowercase")]
pub enum Kind {`);
  }),
);

it.effect("Eq is dropped only where a float is reachable", () =>
  Effect.gen(function* body() {
    const Inner = Schema.Struct({ ratio: Schema.Finite }).annotate({ identifier: "Inner" });
    const Outer = Schema.Struct({ inner: Inner }).annotate({ identifier: "Outer" });
    const Whole = Schema.Struct({ count: Schema.Int }).annotate({ identifier: "Whole" });
    const source = yield* rust({ Inner, Outer, Whole });
    expect(source).toContain(`#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Outer {`);
    expect(source).toContain(`#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Whole {`);
  }),
);

it.effect("imports list only what the output uses, sorted", () =>
  Effect.gen(function* body() {
    const Plain = Schema.Struct({ text: Schema.String }).annotate({ identifier: "Plain" });
    const plain = yield* rustWith(["specta::Type", "schemars::JsonSchema"])({ Plain });
    expect(plain).toContain(`use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;
`);
    expect(plain).not.toContain("BTreeMap");
    const onlyConstants = yield* rust({ ORIGIN: "x" });
    expect(onlyConstants).not.toContain("use ");
  }),
);

it.effect("descriptions become doc comments on types, fields, and variants", () =>
  Effect.gen(function* body() {
    const Note = Schema.Struct({
      text: Schema.String.annotate({ description: "The body.\nKept as written." }),
    }).annotate({ identifier: "Note", description: "A note." });
    const Kind = Schema.Literals(["draft", "final"]).annotate({
      identifier: "Kind",
      description: "Which kind.",
    });
    const source = yield* rust({ Note, Kind });
    expect(source).toContain(`/// A note.
#[derive(`);
    expect(source).toContain(`    /// The body.
    /// Kept as written.
    pub text: String,`);
    expect(source).toContain(`/// Which kind.
#[derive(`);
  }),
);

it.effect("short struct variants are written on one line like rustfmt does", () =>
  Effect.gen(function* body() {
    const Short = Schema.Union([
      Schema.TaggedStruct("Unit", {}),
      Schema.TaggedStruct("Point", { x: Schema.Finite, y: Schema.Finite }),
    ]).annotate({ identifier: "Short" });
    const source = yield* rust({ Short });
    expect(source).toContain(`pub enum Short {
    Unit,
    Point { x: f64, y: f64 },
}`);
  }),
);

it.effect("awkward literal values and keys still become valid, distinct identifiers", () =>
  Effect.gen(function* body() {
    const Awkward = Schema.Literals(["self", "Self", "ä", "1x"]).annotate({
      identifier: "Awkward",
    });
    const Keys = Schema.Struct({
      self: Schema.String,
      Self: Schema.String,
      crate: Schema.String,
      "1st": Schema.String,
    }).annotate({ identifier: "Keys" });
    const source = yield* rust({ Awkward, Keys });
    expect(source).toContain(`    #[serde(rename = "self")]
    SelfValue,
    #[serde(rename = "Self")]
    SelfValue2,
    #[serde(rename = "ä")]
    Value,
    #[serde(rename = "1x")]
    V1x,`);
    expect(source).toContain(`    pub self_: String,
    #[serde(rename = "Self")]
    pub self_2: String,
    pub crate_: String,
    #[serde(rename = "1st")]
    pub field_1st: String,`);
  }),
);
