import { Array as Arr, Result, Schema, String as Str, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { ArticleInput } from "./sloppedia-input";

const VALID = {
  slug: "web-dev",
  title: "Web 開発",
  description: "Web の開発である。",
  body: "Web 開発は、[Web](https://example.com) の開発である[^mdn]。\n\n## 歴史\n\n[^mdn]: MDN\n",
  tags: ["技術"],
  infobox: [{ label: "公開", value: "2026年", href: "https://example.com" }],
};

const LONG_TITLE_LENGTH = 61;

const TOO_MANY_TAGS = 6;

const decode = Schema.decodeUnknownResult(ArticleInput);

const accepts = (input: unknown): boolean => Result.isSuccess(decode(input));

const rejected: readonly (readonly [string, Readonly<Record<string, unknown>>])[] = [
  ["slug に大文字がある", { slug: "Web-Dev" }],
  ["slug にアンダースコアがある", { slug: "web_dev" }],
  ["slug がハイフンで終わる", { slug: "web-" }],
  ["title が空である", { title: "" }],
  ["title が長すぎる", { title: Str.repeat(LONG_TITLE_LENGTH)("長") }],
  ["description が「。」で終わらない", { description: "Web の開発" }],
  ["description にむき出しの URL がある", { description: "https://example.com の説明である。" }],
  ["description にリンクがある", { description: "[Web](https://example.com) の説明である。" }],
  ["description に記事へのリンクがある", { description: "[Web](/sloppedia/web) の説明である。" }],
  ["body に # の見出しがある", { body: "# Web 開発\n\n本文である。\n" }],
  ["body が太字の題名で始まる", { body: "**Web 開発**は、Web の開発である。\n" }],
  ["body にむき出しの URL がある", { body: "詳しくは https://example.com にある。\n" }],
  ["body に MDX の波括弧がある", { body: "Web 開発は {x} である。\n" }],
  ["body に MDX の山括弧がある", { body: "Web 開発は <b>開発</b> である。\n" }],
  ["body の脚注が番号である", { body: "Web 開発は、Web の開発である[^1]。\n\n[^1]: MDN\n" }],
  ["tags が多すぎる", { tags: Arr.makeBy(TOO_MANY_TAGS, (index) => `タグ${String(index)}`) }],
  [
    "infobox のリンクが Web の URL でない",
    { infobox: [{ label: "公開", value: "2026年", href: "ftp://example.com" }] },
  ],
];

describe("ArticleInput", () => {
  test("体裁に沿った記事を受け付ける", () => {
    expect(accepts(VALID)).toBe(true);
  });

  test("tags と infobox は省いてよい", () => {
    const { tags: _tags, infobox: _infobox, ...required } = VALID;
    expect(accepts(required)).toBe(true);
  });

  test.each(rejected)("%s記事を断る", (_name, change) => {
    expect(accepts({ ...VALID, ...change })).toBe(false);
  });

  test("断った理由を項目ごとに返す", () => {
    const message = pipe(
      decode({ ...VALID, description: "Web の開発" }),
      Result.match({ onFailure: (error) => error.message, onSuccess: () => "" }),
    );
    expect(message).toContain("文末は「。」で終える");
  });
});
