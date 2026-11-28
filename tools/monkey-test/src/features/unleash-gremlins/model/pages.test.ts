import { Array as Arr } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { pagesOf } from "./pages.ts";

const ORIGIN = "https://site.test";

describe("pagesOf", () => {
  it("starts at the root and keeps the same-origin documents in a fixed order", () => {
    expect(
      pagesOf({
        origin: ORIGIN,
        hrefs: [
          "/b/",
          "https://other.test/x",
          "/a/#top",
          "/a/",
          "/file.zip",
          "mailto:x@site.test",
          "/",
          "/c.html",
        ],
      }),
    ).toStrictEqual([`${ORIGIN}/`, `${ORIGIN}/a/`, `${ORIGIN}/b/`, `${ORIGIN}/c.html`]);
  });

  it("gives the same pages for the same links", () => {
    const hrefs = ["/z", "/y", "/x"];
    expect(pagesOf({ origin: ORIGIN, hrefs })).toStrictEqual(
      pagesOf({ origin: ORIGIN, hrefs: Arr.reverse(hrefs) }),
    );
  });
});
