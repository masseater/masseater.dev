import type { Reference } from "@masseater.dev/sashi";
import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { pagesOf } from "./pages.ts";

const reference = (fields: Partial<Reference>): Reference => ({
  slug: "quiet-site",
  title: "静かなサイト",
  kind: "site",
  url: "https://example.com/a",
  note: "余白が広い",
  date: "2026-11-28",
  ...fields,
});

const htmlAt = (references: readonly Reference[], path: string): string =>
  pipe(
    pagesOf(references),
    Arr.findFirst((page) => page.path === path),
    Option.map(({ html }) => html),
    Option.getOrElse(() => ""),
  );

describe("pagesOf", () => {
  test("参照が 0 件でも、すべてと 6 つの種類のページを作る", () => {
    const paths = pipe(
      pagesOf([]),
      Arr.map(({ path }) => path),
    );
    expect(paths).toStrictEqual([
      "/",
      "/site/",
      "/ui/",
      "/video/",
      "/music/",
      "/image/",
      "/concept/",
    ]);
  });

  test("種類のページには、その種類の参照だけを載せる", () => {
    const references = [reference({}), reference({ slug: "mv", title: "MV", kind: "video" })];
    expect(htmlAt(references, "/video/")).toContain("MV");
    expect(htmlAt(references, "/video/")).not.toContain("静かなサイト");
  });

  test("すべてのページには全部を載せ、サイドバーに件数を出す", () => {
    const html = htmlAt([reference({}), reference({ slug: "b", title: "b", kind: "ui" })], "/");
    expect(html).toContain("静かなサイト");
    expect(html).toContain('aria-current="page"><span>すべて</span><span class="count">2</span>');
  });

  test("題名や備考の HTML を文字として書き出す", () => {
    expect(htmlAt([reference({ title: "<b>x</b>" })], "/")).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  test("リンクのない参照は、リンクにせず題名だけを書く", () => {
    const { url: _unused, ...concept } = reference({ kind: "concept" });
    expect(htmlAt([concept], "/concept/")).toContain('<span class="name">静かなサイト</span>');
  });
});
