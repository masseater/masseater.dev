import { Array as Arr, pipe } from "effect";
import type { PageHeaders } from "security-headers/static";
import { expect, test } from "vite-plus/test";

import { assetHeaders } from "./asset-headers.ts";

const CSP = "Content-Security-Policy";

const FIRST_PAGE = 1;

const pagesOf = (count: number): readonly PageHeaders[] =>
  pipe(
    Arr.range(FIRST_PAGE, count),
    Arr.map((index) => ({
      path: `/app/${index}/`,
      headers: { [CSP]: `script-src 'sha256-${index}'` },
    })),
  );

test("a page rule replaces the document CSP with its own", () => {
  expect(
    assetHeaders({ documentHeaders: { [CSP]: "default-src 'self'" }, pages: pagesOf(FIRST_PAGE) }),
  ).toContain(`/app/1/\n  ! ${CSP}\n  ${CSP}: script-src 'sha256-1'\n`);
});

test.each([
  { count: 98, throws: false },
  { count: 99, throws: true },
])("$count pages exceed the 100-rule limit: $throws", ({ count, throws }) => {
  const write = (): string => assetHeaders({ documentHeaders: {}, pages: pagesOf(count) });
  if (throws) {
    expect(write).toThrow(RangeError);
  } else {
    expect(write).not.toThrow();
  }
});
