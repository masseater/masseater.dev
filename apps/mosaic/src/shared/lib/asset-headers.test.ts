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
      path: `/mosaic/${index}/`,
      headers: { [CSP]: `script-src 'sha256-${index}'` },
    })),
  );

const FITTING_PAGES = 97;
const EXCEEDING_PAGES = 98;

test("ページのルールは文書の CSP を外してから自分の CSP を付ける", () => {
  expect(
    assetHeaders({ documentHeaders: { [CSP]: "default-src 'self'" }, pages: pagesOf(FIRST_PAGE) }),
  ).toContain(`/mosaic/1/\n  ! ${CSP}\n  ${CSP}: script-src 'sha256-1'\n`);
});

test("97 ページなら 100 個のルールの上限に収まる", () => {
  expect(() => assetHeaders({ documentHeaders: {}, pages: pagesOf(FITTING_PAGES) })).not.toThrow();
});

test("98 ページで 100 個のルールの上限を超える", () => {
  expect(() => assetHeaders({ documentHeaders: {}, pages: pagesOf(EXCEEDING_PAGES) })).toThrow(
    RangeError,
  );
});
