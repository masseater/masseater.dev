import { describe, expect, it } from "@effect/vitest";

import { distinct, fieldIdentifier, snakeCase, variantIdentifier } from "./names.ts";

describe("snakeCase", () => {
  it.each([
    ["updatedAt", "updated_at"],
    ["URL", "url"],
    ["HTTPServer", "http_server"],
    ["with-dash", "with_dash"],
    ["1st", "field_1st"],
    ["über", "ber"],
  ])("%s becomes %s", (key, expected) => {
    expect(snakeCase(key)).toBe(expected);
  });
});

describe("fieldIdentifier", () => {
  it.each([
    ["type", "r#type"],
    ["self", "self_"],
    ["super", "super_"],
    ["crate", "crate_"],
    ["", "value"],
    ["plain", "plain"],
  ])("%s becomes %s", (snake, expected) => {
    expect(fieldIdentifier(snake)).toBe(expected);
  });
});

describe("variantIdentifier", () => {
  it.each([
    ["draft-accepted", "DraftAccepted"],
    ["VERY_HIGH", "VeryHigh"],
    ["1x", "V1x"],
    ["with space", "WithSpace"],
    ["self", "SelfValue"],
    ["Self", "SelfValue"],
    ["crate", "Crate"],
    ["ä", "Value"],
  ])("%s becomes %s", (value, expected) => {
    expect(variantIdentifier(value)).toBe(expected);
  });
});

describe("distinct", () => {
  it("numbers repeated names and keeps the first", () => {
    expect(distinct("")(["SelfValue", "SelfValue", "Other", "SelfValue"])).toStrictEqual([
      "SelfValue",
      "SelfValue2",
      "Other",
      "SelfValue3",
    ]);
  });

  it("drops a trailing underscore before numbering and ignores the raw prefix", () => {
    expect(distinct("_")(["self_", "self_", "r#type", "type"])).toStrictEqual([
      "self_",
      "self_2",
      "r#type",
      "type_2",
    ]);
  });

  it("does not reuse a name that a later suffix would collide with", () => {
    expect(distinct("")(["A2", "A", "A"])).toStrictEqual(["A2", "A", "A3"]);
  });
});
