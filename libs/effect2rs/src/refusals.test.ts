import { expect, it } from "@effect/vitest";
import { Effect, Schema, String } from "effect";

import { failure, rust } from "./effect2rs.test.support.ts";

const ONE = 1;
const TWO = 2;

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

it.effect("a value that is neither a schema nor a constant is refused by its export name", () =>
  Effect.gen(function* body() {
    const refused = yield* failure({ helper: () => "x" });
    expect(refused).toMatchObject({
      path: "helper",
      reason: "exports must be schemas, strings, numbers, or booleans",
    });
  }),
);

it.effect("a union that is not string literals or tagged structs is refused", () =>
  Effect.gen(function* body() {
    const Numbers = Schema.Literals([ONE, TWO]).annotate({ identifier: "Numbers" });
    const refused = yield* failure({ Numbers });
    expect(refused).toMatchObject({
      path: "Numbers",
      reason:
        "only an identified union of string literals, or of structs sharing a literal tag, becomes a Rust enum",
    });
  }),
);

it.effect("one schema exported under two names is generated once", () =>
  Effect.gen(function* body() {
    const Kind = Schema.Literals(["left", "right"]).annotate({ identifier: "Kind" });
    const source = yield* rust({ Kind, Again: Kind });
    expect(String.split("pub enum Kind")(source)).toHaveLength(TWO);
    expect(source).not.toContain("Again");
  }),
);
