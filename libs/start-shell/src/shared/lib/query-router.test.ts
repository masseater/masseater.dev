import { expect, it } from "@effect/vitest";
import { createRootRoute } from "@tanstack/react-router";

import { createTextSearchRouter } from "./query-router.ts";

const NUMERIC = "?keyword=2026";

const BOOLEAN = "?keyword=true";

it("数字や真偽値に見える検索語を文字列のまま読む", () => {
  const { parseSearch } = createTextSearchRouter(createRootRoute()).options;
  expect(parseSearch(NUMERIC)).toStrictEqual({ keyword: "2026" });
  expect(parseSearch(BOOLEAN)).toStrictEqual({ keyword: "true" });
});
