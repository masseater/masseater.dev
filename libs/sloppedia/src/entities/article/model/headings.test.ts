import { describe, expect, test } from "vite-plus/test";

import { headingsOf, numbered } from "./headings.ts";

describe("headingsOf", () => {
  test("節と小節を平らに並べ、脚注の見出しを除く", () => {
    expect(
      numbered(
        headingsOf([
          { id: "a", value: "A", children: [{ id: "a-1", value: "A1" }] },
          { id: "b", value: "B" },
          { id: "footnote-label", value: "出典" },
        ]),
      ),
    ).toStrictEqual([
      { id: "a", value: "A", level: "section", number: "1" },
      { id: "a-1", value: "A1", level: "subsection", number: "1.1" },
      { id: "b", value: "B", level: "section", number: "2" },
    ]);
  });

  test("目次の形でなければ空にする", () => {
    expect(headingsOf("not a toc")).toStrictEqual([]);
  });
});
