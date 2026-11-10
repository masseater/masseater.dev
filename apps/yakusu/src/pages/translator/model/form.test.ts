import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { formFor } from "./form.ts";

describe("formFor", () => {
  it("passes the chosen style for Japanese", () => {
    expect(formFor({ target: "ja", choice: "polite" })).toStrictEqual(Option.some("polite"));
  });

  it("lets the model choose when the style is automatic", () => {
    expect(formFor({ target: "ja", choice: "auto" })).toStrictEqual(Option.none());
  });

  it("drops the style for other languages", () => {
    expect(formFor({ target: "en", choice: "plain" })).toStrictEqual(Option.none());
  });
});
