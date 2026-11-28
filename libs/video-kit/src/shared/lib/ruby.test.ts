import { describe, expect, it } from "vite-plus/test";

import { readOf, writtenOf } from "./ruby.ts";

const SAY = "{至れり尽くせり|いたれりつくせり}なのだ";

describe("ruby", () => {
  it("shows the written form on screen", () => {
    expect(writtenOf(SAY)).toBe("至れり尽くせりなのだ");
  });

  it("gives the reading to the voice", () => {
    expect(readOf(SAY)).toBe("いたれりつくせりなのだ");
  });
});
