import { expect, it } from "@effect/vitest";
import { createTextSearchRouter } from "@masseater.dev/start-shell/query-router";
import { createRootRoute } from "@tanstack/react-router";

const NUMERIC = "?keyword=2026";

const BOOLEAN = "?keyword=true";

it("数字や真偽値に見える検索語を文字列のまま読む", () => {
  const { parseSearch } = createTextSearchRouter(createRootRoute()).options;
  expect(parseSearch?.(NUMERIC)).toEqual({ keyword: "2026" });
  expect(parseSearch?.(BOOLEAN)).toEqual({ keyword: "true" });
});
