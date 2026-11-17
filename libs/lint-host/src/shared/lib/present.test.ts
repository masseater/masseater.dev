import { Option, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { present } from "./present.ts";

const named = (name: string): { readonly name: string } => ({ name });

describe("present", () => {
  test("builds the fields from a present value", () => {
    expect(present(Option.some("y8"), named)).toStrictEqual({ name: "y8" });
  });

  test("gives no fields for an absent value", () => {
    expect(pipe(Option.none<string>(), present(named))).toStrictEqual({});
  });
});
