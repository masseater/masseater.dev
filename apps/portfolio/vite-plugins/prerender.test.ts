import { expect, test } from "vite-plus/test";

import { withLastmod } from "./prerender.ts";

const MODIFIED = "2026-01-02";

const HTML = `<head><meta property="article:modified_time" content="${MODIFIED}"/></head>`;

test.each(["/sloppedia", "/sloppedia/piper", "/og/sloppedia/piper.png"])(
  "%s は更新日があっても sitemap から外す",
  (path) => {
    expect(withLastmod({ page: { path }, html: HTML })).toStrictEqual({
      path,
      sitemap: { exclude: true },
    });
  },
);

test("blogs の記事は sitemap に残し、更新日を lastmod にする", () => {
  expect(withLastmod({ page: { path: "/blogs/piper" }, html: HTML })).toStrictEqual({
    path: "/blogs/piper",
    sitemap: { lastmod: MODIFIED },
  });
});

test("Sloppedia に似た名前のパスは sitemap から外さない", () => {
  expect(withLastmod({ page: { path: "/sloppedia-x" }, html: HTML })).toStrictEqual({
    path: "/sloppedia-x",
    sitemap: { lastmod: MODIFIED },
  });
});

test("更新日の無い公開ページは何も書き換えない", () => {
  expect(withLastmod({ page: { path: "/blogs" }, html: "<head></head>" })).toBeUndefined();
});
