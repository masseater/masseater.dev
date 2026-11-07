import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, cleanedOf } from "./__tests__/fake-judge.ts";
import { sentencesOf } from "./segment.ts";

const textsOf = (text: string): readonly string[] =>
  pipe(
    sentencesOf({ text, format: "yaml" }),
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );

test("reads scalars that look like prose, block scalars and comments", () => {
  expect(
    textsOf(
      '# 設定です\nid: abc\ntitle: 記事\ndesc: |\n  一行目です。\n  二行目です。\nq: "引用 です"\n',
    ),
  ).toStrictEqual([" 設定です", "記事", "  一行目です。\n", "  二行目です。\n", "引用 です"]);
});

test("finds and removes an injection in a comment", () =>
  Effect.runPromise(
    Effect.gen(function* comment() {
      const text = `name: build\n# ${INJECTION}\nsteps:\n  - run: テストを実行する\n`;
      const actual = yield* cleanedOf({ text, format: "yaml" });
      expect(actual).toStrictEqual({
        found: [` ${INJECTION}`],
        cleaned: "name: build\n#\nsteps:\n  - run: テストを実行する\n",
      });
    }),
  ));

test("reads YAML front matter in Markdown", () =>
  Effect.runPromise(
    Effect.gen(function* front() {
      const text = `---\ntitle: 記事\ndescription: ${INJECTION}\n---\n\n本文です。\n`;
      const actual = yield* cleanedOf({ text, format: "markdown" });
      expect(actual).toStrictEqual({
        found: [INJECTION],
        cleaned: "---\ntitle: 記事\ndescription: \n---\n\n本文です。\n",
      });
    }),
  ));
