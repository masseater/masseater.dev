import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, cleanedOf } from "./__tests__/fake-judge.ts";
import { sentencesOf } from "./segment.ts";

const textsOf = (text: string, format: string): readonly string[] =>
  pipe(
    sentencesOf({ text, format }),
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );

test("reads comments and strings that look like prose", () => {
  expect(
    textsOf(
      '# 設定を読む\ndef load(path):\n    """ファイルを開く。"""\n    return open(path, "r")\n',
      "py",
    ),
  ).toStrictEqual(["# 設定を読む", '"""ファイルを開く。', '"""']);
});

test("reads a code block in Markdown by its language", () => {
  const text = '使い方です。\n\n```ts\n// 初期化する\nconst id = "abc";\n```\n';
  expect(textsOf(text, "markdown")).toStrictEqual(["使い方です。", "// 初期化する"]);
});

test("finds and removes an injection in a code comment", () =>
  Effect.runPromise(
    Effect.gen(function* comment() {
      const text = `const total = sum(items);\n// ${INJECTION}\nexport { total };\n`;
      const actual = yield* cleanedOf({ text, format: "typescript" });
      expect(actual).toStrictEqual({
        found: [`// ${INJECTION}`],
        cleaned: "const total = sum(items);\n\nexport { total };\n",
      });
    }),
  ));

test("reads values, strings and comments in config files", () => {
  expect(
    [
      textsOf("; 共有設定\n[mail]\nfooter = 送信者に返信してください\n", "ini"),
      textsOf('# ビルドする\nFROM node:24\nLABEL description="社内ツール です"\n', "dockerfile"),
      textsOf('title = "週報 です"\n', "toml"),
    ].flat(),
  ).toStrictEqual([
    "; 共有設定",
    "送信者に返信してください",
    "# ビルドする",
    '"社内ツール です"',
    '"週報 です"',
  ]);
});
