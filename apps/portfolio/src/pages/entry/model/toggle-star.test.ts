import { expect, test } from "vite-plus/test";

import { toggleStar } from "./toggle-star";

test("スターを付けると数が増える", () => {
  expect(toggleStar(true)({ status: "found", count: 2, starred: false })).toStrictEqual({
    status: "found",
    count: 3,
    starred: true,
  });
});

test("スターを外すと数が減る", () => {
  expect(toggleStar(false)({ status: "found", count: 3, starred: true })).toStrictEqual({
    status: "found",
    count: 2,
    starred: false,
  });
});

test("すでに同じ状態なら数を変えない", () => {
  expect(toggleStar(true)({ status: "found", count: 3, starred: true })).toStrictEqual({
    status: "found",
    count: 3,
    starred: true,
  });
});

test("記事がないときは変えない", () => {
  expect(toggleStar(true)({ status: "missing" })).toStrictEqual({ status: "missing" });
});
